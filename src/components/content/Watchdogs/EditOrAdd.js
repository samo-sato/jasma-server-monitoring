import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { generateStatusMsg, elementToggle } from '../../../functions'
import fetchAPI from '../../../fetchAPI'
import { constants } from '../../../constants'
import { generateHelp, generateSnoozeUrl } from '../../../functions'

// this component renders content for:
// page where user nac add new "Watchdog" (props.adding === true)
// ...or...
// page where user can edit existing "Watchdog" (props.adding === false)
function EditOrAdd(props) {

  // react "useRef" hook
  const inputs = {} // using it to get data from input fields
  inputs.name = useRef(null)
  inputs.url = useRef(null)
  inputs.enabled = useRef(null)
  inputs.email_notif = useRef(null)
  inputs.passive = useRef(null)
  const btnSave = useRef(null) // save button ref
  const btnDelete = useRef(null) // delete button ref
  const urlInputContainer = useRef(null) // html block for url input field and surroundings

  // react "useParams" hook
  const { watchdogId } = useParams() // getting ID of current watchdog (based on react router path)

  // react "useParams" hook
  // const { watchdogId } = props.adding ? null : useParams() // when adding new watchdog, then no need for watchdog id

  // possible textual hints for selection of "operating mode"
  const hintActiveMode = 'In "active mode", watchdog will periodically make requests to given URL. If no http correct response status code is received for long enough time period, service will be considered off-line.'
  const hintPassiveMode = 'In "passive mode", watchdog will be listening for requests from the service on given URL. If requests stop comming for long enough time period, then service status will be considered off-line.'

  // react "useState" hook
  const [hint, setHint] = useState(hintActiveMode) // placeholder for textual hint for "operating mode" selectbox
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
    setStatusMsg(generateStatusMsg('Please wait...'))
    elementToggle.disable(btnSave) // prevent user from clicking button while processing request
    console.log('saveWatchdog runs...')

    // harvesting input data
    const newWatchdogData = {
      name: inputs.name.current.value,
      url: inputs.url.current.value,
      enabled: inputs.enabled.current.checked ? 1 : 0,
      email_notif: inputs.email_notif.current.checked ? 1 : 0,
      passive: Number(inputs.passive.current.value)
    }

    if (props.adding) { // adding new watchdog
      fetchAPI.addWatchdog(newWatchdogData)
        .then(response => {
          setStatusMsg(generateStatusMsg(response.data, 'good'))
          elementToggle.enable(btnSave)
        })
        .catch(error => {
          let err = error ? error : 'Server error'
          setStatusMsg(generateStatusMsg(err, 'bad'))
          elementToggle.enable(btnSave)
        })
    } else { // updating existing watchdog
      fetchAPI.updateWatchdog(watchdogId, newWatchdogData)
        .then(response => {
          setStatusMsg(generateStatusMsg(response.data, 'good'))
        })
        .catch(error => {
          let err = error ? error : 'Server error'
          setStatusMsg(generateStatusMsg(err, 'bad'))
        })
    }
  }

  function deleteWatchdog() {

    setStatusMsg('Please wait...')
    elementToggle.disable(btnDelete)
    fetchAPI.deleteWatchdog(watchdogId)
      .then(response => {
        console.log('redirecting...')
        navigate('/watchdogs', {
          state: {watchdogDeleted: response}
        })
      })
      .catch(error => {
        setStatusMsg(generateStatusMsg(error, 'bad'))
        elementToggle.enable(btnDelete)
      })
  }


  // useEffect ran twice workaround
  const effectRan = useRef(false)

  useEffect(() => {

    if (effectRan.current === false) { // useEffect ran twice workaround

      // this logic fetches and sets data about current "Watchdog" item (if in "editing mode")
      if (props.adding) { // we are adding new "Watchdog" - no need to pre-fill inputs with current values
        setStatus({
          loaded: true,
          found: true
        })
      } else { // we are editting existing "Watchdog" - need to fetch and set current "Watchdog" data in order to pre-fill them into input fields
        fetchAPI.getWatchdog(watchdogId)
          .then(watchdog => { // watchdog item retrieved...
            setStatus({
              loaded: true,
              found: true
            })
            setWatchdog(watchdog) // save watchdog data to state variable

            // set appropriate textual hint for "operating mode" selectbox
            const defaultHint = watchdog.passive === 0 ? hintActiveMode : hintPassiveMode
            setHint(defaultHint)

          })
          .catch(error => { // error
            setStatus({
              loaded: true,
              found: false
            })
          })
      }

      // useEffect ran twice workaround
      return () => {
        effectRan.current = true
      }

    }

  }, [props.adding, watchdogId])

  // handling button clicks for different oparetions
  function handleClick(e) {

    const btn = e.target.value

    // add new watchdog
    if (btn === "save") {
      saveWatchdog()
    }

    // delete watchdog
    if (btn === "delete") {
      deleteWatchdog()
    }

  }

  // rendering "hint" text based on selected "operating mode" option
  function handleSelectStatusChange(e) {
    if (e.target.value === "0") {
      setHint(hintActiveMode)
      elementToggle.show(urlInputContainer)
    } else {
      setHint(hintPassiveMode)
      elementToggle.hide(urlInputContainer)
    }
  }

  // handle user's click on "Copy URL" button in order to copy given string to clipboard
  function handleCopyUrl() {
    let urlString = inputs.url.current.value
    navigator.clipboard.writeText(urlString)
  }

  if (status.loaded && status.found) { // item found and loaded
    return (
      <article>
        {watchdog && <h1>Edit "<i>{watchdog && watchdog.name}</i>" watchdog</h1>}
        {!watchdog && <h1>Add new watchdog</h1>}
        <div className="sameLine">
          <input type="text" className="textInput" ref={inputs.name} defaultValue={watchdog && watchdog.name} maxLength={constants.maxWatchdogNameLength} /><span> Name</span>
        </div>
        <div className="sameLine" ref={urlInputContainer}>
          <div>
            <input
              type="text"
              className="textInput"
              ref={inputs.url}
              defaultValue={watchdog && (watchdog.passive ? generateSnoozeUrl(watchdog.private_id) : watchdog.url)}
              maxLength={constants.maxWatchdogUrlLength}
              disabled={watchdog && watchdog.passive === 1}
            />
            {watchdog && watchdog.passive === 1 ?
              <>
                <span> Logging URL{generateHelp('The monitored service must request this URL at specified intervals to maintain its status.')}</span>
                <button onClick={handleCopyUrl}>Copy URL</button>
              </>
              :
              <span> Endpoint URL{generateHelp('Watchdog will send requests to this URL at specified intervals. The response will determine whether the service is considered "online" or "offline" by Watchdog. HTTP response status codes between 200 and 399 (inclusive) indicate that the monitored service is "online". Any other response status code or error indicate that the service is "offline".')}</span>
            }
          </div>
        </div>
        <div className="sameLine">
          <input type="checkbox" defaultChecked={watchdog && watchdog.enabled === 1 ? true : false} ref={inputs.enabled} id="cEnable" className="checkbox" />
          <label htmlFor="cEnable">Enable this watchdog</label>
        </div>
        <div className="sameLine">
          <input type="checkbox" defaultChecked={watchdog && watchdog.email_notif === 1 ? true : false} ref={inputs.email_notif} id="cNotif" className="checkbox" />
          <label htmlFor="cNotif">Enable email notifications</label>
        </div>
        <div className="sameLine">
          <span>Operating mode: </span>
          <select defaultValue={watchdog && watchdog.passive} ref={inputs.passive} onChange={handleSelectStatusChange} disabled={!props.adding}>
            <option value={0}>Active</option>
            <option value={1}>Passive</option>
          </select>
        </div>
        <p><i>{hint}</i></p>
        <div className="sameLine">
          <div style={{ float: 'left' }}>
            <button value="save" className="okBtn" ref={btnSave} onClick={handleClick}>
              {watchdog ? 'Save changes' : 'Add watchdog'}
            </button>
          </div>
          <div style={{ float: 'right' }}>
            {watchdog && <button value="delete" className="cautionBtn" ref={btnDelete} onClick={handleClick}>Delete</button>}
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
        <p>Watchdog #{watchdogId} not found </p>
      </article>
    )
  } else if (status.loaded === false) { // still loading data
    return (
      <article>
        <p>Loading watchdog #{watchdogId} ... </p>
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

export default EditOrAdd
