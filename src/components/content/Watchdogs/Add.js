import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingIndicator from '../../LoadingIndicator.js'
import CopyButton from '../../CopyButton.js'
import { PARSE_INT_BASE, generateRandomString, msToWords, widLength } from '../../../globals.js'
import { activeUrlName, passiveUrlName, activeUrlHelp, passiveUrlHelp, notifHelp } from './Watchdogs.js'
import { generateStatusMsg, elementToggle } from '../../../functions.js'
import { addWatchdog } from '../../../fetchAPI.js'
import { generateHelp, generateSnoozeUrl } from '../../../functions.js'

function Add() {

  // react "useRef" hook
  const inputs = {} // using it to get data from input fields
  inputs.name = useRef(null)
  inputs.url = useRef(null)
  inputs.wid = useRef(null)
  inputs.enabled = useRef(null)
  inputs.email_notif = useRef(null)
  inputs.threshold = useRef(null)
  inputs.passive = useRef(null)
  const btnSave = useRef(null) // save button ref
  const urlInputContainer = useRef(null) // html block for url input field and surroundings

  // possible textual hints for selection of "operating mode"
  const hintActiveMode = `Imagine the "active mode" as Watchdog regularly checking in on the "${activeUrlName}" every ${msToWords(parseInt(process.env.REACT_APP_REPEAT_DELAY, PARSE_INT_BASE))}. If there's no reply or the response code isn't in the 2xx range, we'll flag the monitored service as offline.`
  const hintPassiveMode = `Imagine the "passive mode" as Watchdog sitting back and listening for requests from the monitored service at the "${passiveUrlName}". If there's a gap of more than ${msToWords(parseInt(process.env.REACT_APP_REPEAT_DELAY, PARSE_INT_BASE))} between received requests, we'll mark the service status as offline.`

  // react "useState" hook
  const [hint, setHint] = useState(hintActiveMode) // placeholder for textual hint for "operating mode" selectbox
  const [urlLabel, setUrlLabel] = useState(activeUrlName)
  const [urlHelp, setUrlHelp] = useState(generateHelp(activeUrlHelp))
  const [inputDisable, setInputDisable] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [copyButton, setCopyButton] = useState('')
  const [wid, setWid] = useState('')

  const [status, setStatus] = useState({ // status data will determine what will be rendered as main content
    loaded: false,
    found: null
  })
  const [statusMsg, setStatusMsg] = useState(null) // status message shown after execute button is clicked and processed

  // react "useNavigate" hook
  const navigate = useNavigate()

  // save watchdog data
  function handleSave() {
    setStatusMsg(generateStatusMsg(<LoadingIndicator text="Adding Watchdog" />))
    elementToggle.disable(btnSave) // prevent user from clicking button while processing request

    // harvesting input data
    const newWatchdogData = {
      adding: true,
      name: inputs.name.current.value,
      url: inputs.url.current.value,
      wid: inputs.wid.current.value,
      enabled: inputs.enabled.current.checked ? 1 : 0,
      email_notif: inputs.email_notif.current.checked ? 1 : 0,
      threshold: inputs.threshold.current.value,
      passive: Number(inputs.passive.current.value),
    }

    addWatchdog(newWatchdogData)
      .then(response => {
        elementToggle.enable(btnSave)
        navigate('/watchdogs', {
          state: {message: response.data}
        })
      })
      .catch(error => {
        setStatusMsg(generateStatusMsg(error, 'bad'))
        elementToggle.enable(btnSave)
      })
  }

  useEffect(() => {

    setStatus({
      loaded: true,
      found: true
    })

    // by default, active mode Watchdog is being added
    changeMode('active')

  }, [])

  // rendering "hint" text based on selected "operating mode" option
  function handleModeChange(e) {
    if (e.target.value === "0") {
      changeMode('active')
    } else {
      changeMode('passive')
    }
  }

  // handle input value change => when typing into it, update associated state
  function handleInputChange(e) {
    setInputValue(e.target.value)
  }

  // chage operating mode of Watchdog
  function changeMode(mode) {

    if (mode === 'active') {
      setHint(hintActiveMode)
      setUrlLabel(activeUrlName)
      setUrlHelp(generateHelp(activeUrlHelp))
      setInputDisable(false)
      setInputValue('')
      setCopyButton('')
    }

    if (mode === 'passive') {

      // generate passive mode Watchdog ID and associated snoozing URL
      const wid = generateRandomString(widLength)
      const snoozingURL = generateSnoozeUrl(wid)

      setHint(hintPassiveMode)
      setUrlLabel(passiveUrlName)
      setUrlHelp(generateHelp(passiveUrlHelp))
      setInputDisable(true)
      setInputValue(snoozingURL)
      setWid(wid)
      const btnComponent = <CopyButton label="Copy url" valueToCopy={snoozingURL} />
      setCopyButton(btnComponent)

    }

  }

  if (status.loaded && status.found) { // item found and loaded
    return (
      <article>
        <h1>Add new watchdog</h1>
        <div className="sameLine">
          <input
            type="text"
            className="textInput"
            ref={inputs.name}
            minLength={parseInt(process.env.REACT_APP_MIN_WD_NAME_LENGTH, PARSE_INT_BASE)}
            maxLength={parseInt(process.env.REACT_APP_MAX_WD_NAME_LENGTH, PARSE_INT_BASE)}
          />
          <span> Name</span>
        </div>
        <div className="sameLine" ref={urlInputContainer}>


        <div>
          <input
            type="text"
            className="textInput"
            ref={inputs.url}
            disabled={inputDisable}
            value={inputValue}
            onChange={handleInputChange}
            minLength={parseInt(process.env.REACT_APP_MIN_WD_URL_LENGTH, PARSE_INT_BASE)}
            maxLength={parseInt(process.env.REACT_APP_MAX_WD_URL_LENGTH, PARSE_INT_BASE)}
          />
          <input type="hidden" defaultValue={wid} ref={inputs.wid} />
          <span> {urlLabel} {urlHelp}</span>
          {copyButton}
        </div>


        </div>
        <div className="sameLine">
          <input type="checkbox" ref={inputs.enabled} id="cEnable" className="checkbox" />
          <label htmlFor="cEnable">Enable this watchdog</label>
        </div>
        <div className="sameLine">
          <input type="checkbox" ref={inputs.email_notif} id="cNotif" className="checkbox" />
          <label htmlFor="cNotif">Enable email notifications</label>
          <span> and notify after </span>
          <input
            type="number"
            className="textInput"
            style={{width:50}}
            ref={inputs.threshold}
            defaultValue={parseInt(process.env.REACT_APP_DEF_THRESHOLD, PARSE_INT_BASE)}
            min={parseInt(process.env.REACT_APP_MIN_THRESHOLD, PARSE_INT_BASE)}
            max={parseInt(process.env.REACT_APP_MAX_THRESHOLD, PARSE_INT_BASE)}
          />
          <span> consecutive "not ok" states</span>
          <span>{generateHelp(notifHelp)}</span>
        </div>
        <div className="sameLine">
          <span>Operating mode: </span>
          <select ref={inputs.passive} onChange={handleModeChange}>
            <option value={0}>Active</option>
            <option value={1}>Passive</option>
          </select>
        </div>
        <p><i>{hint}</i></p>
        <div className="sameLine">
          <div style={{ float: 'left' }}>
            <button value="save" className="okBtn" ref={btnSave} onClick={handleSave}>
              Add watchdog
            </button>
          </div>
          <div className="clearfix">
          </div>
        </div>
        {statusMsg}
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

export default Add
