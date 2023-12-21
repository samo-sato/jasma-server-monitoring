import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import LoadingIndicator from '../../LoadingIndicator.js'
import { PARSE_INT_BASE } from '../../../globals.js'
import { activeUrlName, passiveUrlName, activeUrlHelp, passiveUrlHelp, notifHelp } from './Watchdogs.js'
import { generateStatusMsg, elementToggle } from '../../../functions.js'
import { getWatchdog, updateWatchdog, deleteWatchdog } from '../../../fetchAPI.js'
import { generateHelp, generateSnoozeUrl } from '../../../functions.js'
import CopyButton from '../../CopyButton.js'

function Edit() {

  // react "useRef" hook
  const inputs = {} // using it to get data from input fields
  inputs.name = useRef(null)
  inputs.url = useRef(null)
  inputs.enabled = useRef(null)
  inputs.passive = useRef(null)
  inputs.email_notif = useRef(null)
  inputs.threshold = useRef(null)
  const btnSave = useRef(null) // save button ref
  const btnDelete = useRef(null) // delete button ref

  // react "useParams" hook
  const { watchdogId } = useParams() // getting ID of current watchdog (based on react router path)

  // react "useState" hook
  const [watchdog, setWatchdog] = useState(null) // watchdog item data from API
  const [status, setStatus] = useState({ // status data will determine what will be rendered as main content
    loaded: false,
    found: null
  })
  const [statusMsg, setStatusMsg] = useState(null) // status message shown after execute button is clicked and processed

  // react "useNavigate" hook
  const navigate = useNavigate()

  // save watchdog data
  function saveWatchdog() {
    setStatusMsg(generateStatusMsg(<LoadingIndicator text="Updating Watchdog" />))
    elementToggle.disable(btnSave) // prevent user from clicking button while processing request

    // harvesting input data
    const newWatchdogData = {
      adding: false,
      name: inputs.name.current.value,
      url: inputs.url.current.value,
      enabled: inputs.enabled.current.checked ? 1 : 0,
      email_notif: inputs.email_notif.current.checked ? 1 : 0,
      threshold: inputs.threshold.current.value
    }

    updateWatchdog(watchdogId, newWatchdogData)
      .then(response => {
        setStatusMsg(generateStatusMsg(response.data, 'good'))
        elementToggle.enable(btnSave)
      })
      .catch(error => {
        setStatusMsg(generateStatusMsg(error, 'bad'))
        elementToggle.enable(btnSave)
      })

  }

  function handleDelete() {

    setStatusMsg(<LoadingIndicator text="Removing Watchdog" />)
    elementToggle.disable(btnDelete)
    deleteWatchdog(watchdogId)
      .then(response => {
        navigate('/watchdogs', {
          state: {message: response}
        })
      })
      .catch(error => {
        setStatusMsg(generateStatusMsg(error, 'bad'))
        elementToggle.enable(btnDelete)
      })
  }

  useEffect(() => {

    getWatchdog(watchdogId)
      .then(watchdog => { // watchdog item retrieved...
        setStatus({
          loaded: true,
          found: true
        })
        setWatchdog(watchdog) // save watchdog data to state variable
      })
      .catch(error => { // error
        setStatus({
          loaded: true,
          found: false
        })
      })

  }, [watchdogId])

  // handling button clicks for different oparetions
  function handleClick(e) {

    const btn = e.target.value

    // click and update
    if (btn === "save") {
      saveWatchdog()
    }

    // click and delete
    if (btn === "delete") {
      handleDelete()
    }

  }

  if (status.loaded && status.found) { // item found and loaded
    return (
      <article>
        <h1>Edit "<i>{watchdog.name}</i>" watchdog</h1>
        <div className="sameLine">
          <input
            type="text"
            className="textInput"
            ref={inputs.name}
            defaultValue={watchdog.name}
            minLength={parseInt(process.env.REACT_APP_MIN_WD_NAME_LENGTH, PARSE_INT_BASE)}
            maxLength={parseInt(process.env.REACT_APP_MAX_WD_NAME_LENGTH, PARSE_INT_BASE)}
          />
          <span> Name</span>
        </div>
        <div className="sameLine">


        <div>
          <input
            type="text"
            className="textInput"
            ref={inputs.url}
            defaultValue={watchdog.passive ? generateSnoozeUrl(watchdog.id) : watchdog.url}
            minLength={parseInt(process.env.REACT_APP_MIN_WD_URL_LENGTH, PARSE_INT_BASE)}
            maxLength={parseInt(process.env.REACT_APP_MAX_WD_URL_LENGTH, PARSE_INT_BASE)}
            disabled={watchdog.passive === 1}
          />
          {watchdog.passive === 1 ?
            <>
              <span> {passiveUrlName} {generateHelp(passiveUrlHelp)}</span>
              <CopyButton label="Copy url" valueToCopy={generateSnoozeUrl(watchdog.id)} />
            </>
            :
            <span> {activeUrlName} {generateHelp(activeUrlHelp)}</span>
          }
        </div>


        </div>
        <div className="sameLine">
          <input type="checkbox" defaultChecked={watchdog.enabled === 1 ? true : false} ref={inputs.enabled} id="cEnable" className="checkbox" />
          <label htmlFor="cEnable">Enable this watchdog</label>
        </div>
        <div className="sameLine">
          <input type="checkbox" defaultChecked={watchdog.email_notif === 1 ? true : false} ref={inputs.email_notif} id="cNotif" className="checkbox" />
          <label htmlFor="cNotif">Enable email notifications</label>
          <span> and notify after </span>
          <input
            type="number"
            className="textInput"
            style={{width:50}}
            ref={inputs.threshold}
            defaultValue={watchdog.threshold}
            min={parseInt(process.env.REACT_APP_MIN_THRESHOLD, PARSE_INT_BASE)}
            max={parseInt(process.env.REACT_APP_MAX_THRESHOLD, PARSE_INT_BASE)}
          />
          <span> consecutive "not ok" states</span>
          <span>{generateHelp(notifHelp)}</span>
        </div>
        <div className="sameLine">
          <span className="marginLeft">This Watchdog operates in {watchdog.passive === 0 ? 'active' : 'passive'} mode</span>
        </div>
        <div className="sameLine">
          <div style={{ float: 'left' }}>
            <button value="save" className="okBtn" ref={btnSave} onClick={handleClick}>
              Save changes
            </button>
          </div>
          <div style={{ float: 'right' }}>
            <button value="delete" className="cautionBtn" ref={btnDelete} onClick={handleClick}>Delete</button>
          </div>
          <div className="clearfix">
          </div>
        </div>
        {statusMsg}
      </article>
    )
  } else if (status.loaded && status.found === false) { // API server have not found item
    return (
      <article>
        <p>Watchdog <b>{watchdogId}</b> not found </p>
      </article>
    )
  } else if (status.loaded === false) { // still loading data
    return (
      <article>
        <p>{ <LoadingIndicator text={'Loading Watchdog'} /> }</p>
      </article>
    )
  } else { // something else broke
    return (
      <article>
        <p>Something went wrong</p>
      </article>
    )
  }
}

export default Edit
