import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingIndicator from '../../LoadingIndicator.jsx';
import { toInt, validateEnv, WatchdogData } from '../../../utils.js';
import { activeUrlName, passiveUrlName, activeUrlHelp, passiveUrlHelp, notifHelp } from './Watchdogs.jsx';
import { generateStatusMsg, elementToggle, generateHelp, generateSnoozeUrl } from '../../../functions.jsx';
import { getWatchdog, updateWatchdog, deleteWatchdog } from '../../../fetchAPI.js';
import CopyButton from '../../CopyButton.jsx';

// Import environment variables
const REACT_APP_MIN_WD_NAME_LENGTH = validateEnv(process.env.REACT_APP_MIN_WD_NAME_LENGTH, true);
const REACT_APP_MAX_WD_NAME_LENGTH = validateEnv(process.env.REACT_APP_MAX_WD_NAME_LENGTH, true);
const REACT_APP_MIN_WD_URL_LENGTH = validateEnv(process.env.REACT_APP_MIN_WD_URL_LENGTH, true);
const REACT_APP_MAX_WD_URL_LENGTH = validateEnv(process.env.REACT_APP_MAX_WD_URL_LENGTH, true);
const REACT_APP_MIN_THRESHOLD = validateEnv(process.env.REACT_APP_MIN_THRESHOLD, true);
const REACT_APP_MAX_THRESHOLD = validateEnv(process.env.REACT_APP_MAX_THRESHOLD, true);

function Edit() {

  // React `useRef` hook
  // Using it to get data from input fields
  const inputs = {
    name: useRef<HTMLInputElement>(null),
    url: useRef<HTMLInputElement>(null),
    enabled: useRef<HTMLInputElement>(null),
    passive: useRef<HTMLSelectElement>(null),
    email_notif: useRef<HTMLInputElement>(null),
    threshold: useRef<HTMLInputElement>(null)
  }

  const btnSave = useRef(null) // Save button ref
  const btnDelete = useRef(null) // Delete button ref

  // React `useParams` hook
  const { watchdogId } = useParams() // Getting ID of current watchdog (based on react router path)

  interface Status {
    loaded: boolean;
    found: boolean | null;
  }

  // React `useState` hook
  const [watchdog, setWatchdog] = useState<WatchdogData | null>(null) // Watchdog item data from API
  const [status, setStatus] = useState<Status>({ // Status data will determine what will be rendered as main content
    loaded: false,
    found: null
  })
  const [statusMsg, setStatusMsg] = useState(null) // Status message shown after execute button is clicked and processed

  // React `useNavigate` hook
  const navigate = useNavigate();

  // Save watchdog data
  function saveWatchdog() {
    setStatusMsg(generateStatusMsg('Loading...', ''));
    elementToggle.disable(btnSave) // Prevent user from clicking button while processing request

    // Harvesting input data
    const newWatchdogData = {
      adding: 0,
      name: inputs.name.current?.value ?? '',
      url: inputs.url.current?.value ?? '',
      enabled: inputs.enabled.current?.checked ? 1 : 0,
      email_notif: inputs.email_notif.current?.checked ? 1 : 0,
      threshold: Number(inputs.threshold.current?.value) || 0
    }

    updateWatchdog(watchdogId as string, newWatchdogData)
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

    setStatusMsg(generateStatusMsg('Loading...', ''));
    elementToggle.disable(btnDelete)
    deleteWatchdog(watchdogId as string)
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

    getWatchdog(watchdogId as string)
      .then(watchdog => { // Watchdog item retrieved...
        setStatus({
          loaded: true,
          found: true
        })
        setWatchdog(watchdog) // Save watchdog data to state variable
      })
      .catch(error => { // Error
        console.log(error);
        setStatus({
          loaded: true,
          found: false
        })
      })

  }, [watchdogId])

  // Handling button clicks for different oparetions
  function handleClick(e: any) {

    const btn = e.target.value;

    // Click and update
    if (btn === "save") {
      saveWatchdog();
    }

    // Click and delete
    if (btn === "delete") {
      handleDelete();
    }

  }

  if (status.loaded && status.found && watchdog && watchdog.id) { // Item found and loaded
    return (
      <article>
        <h2>Edit "<i>{watchdog.name}</i>" watchdog</h2>
        <div className="sameLine">
          <input
            type="text"
            className="textInput"
            ref={inputs.name}
            defaultValue={watchdog.name}
            minLength={toInt(REACT_APP_MIN_WD_NAME_LENGTH)}
            maxLength={toInt(REACT_APP_MAX_WD_NAME_LENGTH)}
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
            minLength={toInt(REACT_APP_MIN_WD_URL_LENGTH)}
            maxLength={toInt(REACT_APP_MAX_WD_URL_LENGTH)}
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
            min={toInt(REACT_APP_MIN_THRESHOLD)}
            max={toInt(REACT_APP_MAX_THRESHOLD)}
          />
          <span> consecutive "not ok" state(s)</span>
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
  } else if (status.loaded === false) { // Still loading data
    return (
      <article>
        <p>{ <LoadingIndicator text={'Loading Watchdog'} /> }</p>
      </article>
    )
  } else { // Something else broke
    return (
      <article>
        <p>Something went wrong</p>
      </article>
    )
  }
}

export default Edit;