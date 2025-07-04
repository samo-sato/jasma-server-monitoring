import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CopyButton from '../../CopyButton.jsx';
import { toInt, generateRandomString, msToWords, widLength, validateEnv } from '../../../utils.js';
import { activeUrlName, passiveUrlName, activeUrlHelp, passiveUrlHelp, notifHelp } from './Watchdogs.jsx';
import { generateStatusMsg, elementToggle, generateHelp, generateSnoozeUrl } from '../../../functions.jsx';
import { addWatchdog } from '../../../fetchAPI.js';

// Import environment variables
const REACT_APP_REPEAT_DELAY = validateEnv(process.env.REACT_APP_REPEAT_DELAY, true);
const REACT_APP_MIN_WD_NAME_LENGTH = validateEnv(process.env.REACT_APP_MIN_WD_NAME_LENGTH, true);
const REACT_APP_MAX_WD_NAME_LENGTH = validateEnv(process.env.REACT_APP_MAX_WD_NAME_LENGTH, true);
const REACT_APP_MIN_WD_URL_LENGTH = validateEnv(process.env.REACT_APP_MIN_WD_URL_LENGTH, true);
const REACT_APP_MAX_WD_URL_LENGTH = validateEnv(process.env.REACT_APP_MAX_WD_URL_LENGTH, true);
const REACT_APP_DEF_THRESHOLD = validateEnv(process.env.REACT_APP_DEF_THRESHOLD, true);
const REACT_APP_MIN_THRESHOLD = validateEnv(process.env.REACT_APP_MIN_THRESHOLD, true);
const REACT_APP_MAX_THRESHOLD = validateEnv(process.env.REACT_APP_MAX_THRESHOLD, true);

function Add() {

  // React `useRef` hook
  // Using it to get data from input fields
  const inputs = {
    name: useRef<HTMLInputElement>(null),
    url: useRef<HTMLInputElement>(null),
    wid: useRef<HTMLInputElement>(null),
    enabled: useRef<HTMLInputElement>(null),
    email_notif: useRef<HTMLInputElement>(null),
    threshold: useRef<HTMLInputElement>(null),
    passive: useRef<HTMLSelectElement>(null)
  }

  const btnSave = useRef(null) // Save button ref
  const urlInputContainer = useRef(null) // Html block for url input field and surroundings

  // Possible textual hints for selection of `operating mode`
  const hintActiveMode = `Imagine the "active mode" as Watchdog regularly checking in on the "${activeUrlName}" every ${msToWords(toInt(REACT_APP_REPEAT_DELAY))}. If there's no reply or the response code isn't in the 2xx range, we'll flag the monitored service as offline.`;
  const hintPassiveMode = `Imagine the "passive mode" as Watchdog sitting back and listening for requests from the monitored service at the "${passiveUrlName}". If there's a gap of more than ${msToWords(toInt(REACT_APP_REPEAT_DELAY))} between received requests, we'll mark the service status as offline.`;

  // React `useState` hook
  const [hint, setHint] = useState(hintActiveMode); // Placeholder for textual hint for "operating mode" selectbox
  const [urlLabel, setUrlLabel] = useState(activeUrlName);
  const [urlHelp, setUrlHelp] = useState(generateHelp(activeUrlHelp));
  const [inputDisable, setInputDisable] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [copyButton, setCopyButton] = useState<JSX.Element | string>('');
  const [wid, setWid] = useState('');

  const [status, setStatus] = useState<any>({ // Status data will determine what will be rendered as main content
    loaded: false,
    found: null
  })
  const [statusMsg, setStatusMsg] = useState(null); // Status message shown after execute button is clicked and processed

  // React `useNavigate` hook
  const navigate = useNavigate();

  // Save watchdog data
  function handleSave() {
    setStatusMsg(generateStatusMsg('Loading...', ''));
    elementToggle.disable(btnSave); // Prevent user from clicking button while processing request

    // Harvesting input data
    const newWatchdogData = {
      adding: 1,
      name: inputs.name.current?.value ?? '',
      url: inputs.url.current?.value ?? '',
      wid: inputs.wid.current?.value ?? '',
      enabled: inputs.enabled.current?.checked ? 1 : 0,
      email_notif: inputs.email_notif.current?.checked ? 1 : 0,
      threshold: Number(inputs.threshold.current?.value) || 0,
      passive: Number(inputs.passive.current?.value),
    }

    addWatchdog(newWatchdogData)
    .then(response => {
      elementToggle.enable(btnSave)
      navigate('/watchdogs', {
        state: { message: response.data }
      })
    })
    .catch(error => {
      setStatusMsg(generateStatusMsg(error, 'bad'));
      elementToggle.enable(btnSave);
    })
  }

  useEffect(() => {

    setStatus({
      loaded: true,
      found: true
    })

    // By default, active mode Watchdog is being added
    changeMode('active');

  }, [])

  // Rendering `hint` text based on selected `operating mode` option
  function handleModeChange(e: any) {
    if (e.target.value === "0") {
      changeMode('active');
    } else {
      changeMode('passive');
    }
  }

  // Handle input value change => when typing into it, update associated state
  function handleInputChange(e: any) {
    setInputValue(e.target.value);
  }

  // Chage operating mode of Watchdog
  function changeMode(mode: string) {

    if (mode === 'active') {
      setHint(hintActiveMode);
      setUrlLabel(activeUrlName);
      setUrlHelp(generateHelp(activeUrlHelp));
      setInputDisable(false);
      setInputValue('');
      setCopyButton('');
    }

    if (mode === 'passive') {

      // Generate passive mode Watchdog ID and associated snoozing URL
      const wid = generateRandomString(widLength);
      const snoozingURL = generateSnoozeUrl(wid);

      setHint(hintPassiveMode);
      setUrlLabel(passiveUrlName);
      setUrlHelp(generateHelp(passiveUrlHelp));
      setInputDisable(true);
      setInputValue(snoozingURL);
      setWid(wid);
      const btnComponent = <CopyButton label="Copy url" valueToCopy={snoozingURL} />
      setCopyButton(btnComponent);

    }

  }

  if (status.loaded && status.found) { // Item found and loaded
    return (
      <article>
        <h2>Add new watchdog</h2>
        <div className="sameLine">
          <input
            type="text"
            className="textInput"
            ref={inputs.name}
            minLength={toInt(REACT_APP_MIN_WD_NAME_LENGTH)}
            maxLength={toInt(REACT_APP_MAX_WD_NAME_LENGTH)}
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
            minLength={toInt(REACT_APP_MIN_WD_URL_LENGTH)}
            maxLength={toInt(REACT_APP_MAX_WD_URL_LENGTH)}
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
            defaultValue={toInt(REACT_APP_DEF_THRESHOLD)}
            min={toInt(REACT_APP_MIN_THRESHOLD)}
            max={toInt(REACT_APP_MAX_THRESHOLD)}
          />
          <span> consecutive "not ok" state(s)</span>
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
  } else { // Something else broke
    return (
      <article>
        <p>Something went wrong</p>
      </article>
    )
  }
}

export default Add;
