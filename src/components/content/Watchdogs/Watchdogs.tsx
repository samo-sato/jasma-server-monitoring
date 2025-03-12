import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toInt, msToWords, serErr, validateEnv, autorefreshNote, refreshDelayShort } from '../../../utils.js';
import { generateStatusMsg } from '../../../functions.jsx';
import { getWatchdogs } from '../../../fetchAPI.js';
import LoadingIndicator from '../../LoadingIndicator.jsx';
import List from './List.jsx';

// Import environment variables
const REACT_APP_REPEAT_DELAY = validateEnv(process.env.REACT_APP_REPEAT_DELAY, true);
const monitoringIntervalNote = `Monitoring is executed every ${msToWords(toInt(REACT_APP_REPEAT_DELAY))}`; 

// Textual hints used in another components
export const activeUrlName = 'Endpoint URL';
export const passiveUrlName = 'Snoozing URL';
export const passiveUrlHelp = `The monitored service must request this URL at least every ${msToWords(toInt(REACT_APP_REPEAT_DELAY))} to maintain its status.`;
export const activeUrlHelp = `The Watchdog will check this URL every ${msToWords(toInt(REACT_APP_REPEAT_DELAY))}. If the response code falls within 2xx range, we'll flag the monitored service as online. Any other status code or error will flag the monitored server as offline.`;
export const notifHelp = `For this feature to work, you need to save a valid email address in your Settings and follow instructions regarding email activation.
Watchdog state is evaluated every ${msToWords(toInt(REACT_APP_REPEAT_DELAY))}`;

function Watchdogs() {

  // React `useState` hook
  const [watchdogsData, setWatchdogsData] = useState(null);
  const [message, setMessage] = useState(null);
  const [fetchError, setFetchError] = useState(false);

  // React `useNavigate` hook
  const navigate = useNavigate();

  // React `useLocation` hook
  const location = useLocation();

  const fetchWatchdogs = () => {
    getWatchdogs()
      .then(response => {
        setWatchdogsData(response)
      })
      .catch(error => {
        setFetchError(true)}
      )
  }

  useEffect(() => {

    fetchWatchdogs();

    // Using setInterval to achieve autorefresh of fetched data
    const intervalId = setInterval(() => {
      fetchWatchdogs()
    }, refreshDelayShort)

    if (location.state) {
      setMessage(generateStatusMsg(location.state.message, 'good'));
    }

    return () => {
      clearInterval(intervalId);
    }

  }, [])

  function handleAdd(e: any) {
    navigate('/add-watchdog');
  }

  if (fetchError) {
    return <p>{ serErr }</p>
  } else if (watchdogsData) {
    return (
      <article>
        <h1>Watchdogs</h1>
        <List watchdogs={watchdogsData} />
        <div>
          {message}
        </div>
        <p><i>{ monitoringIntervalNote }</i></p>
        <p><i>{ autorefreshNote }</i></p>
        <button onClick={handleAdd}>Add new Watchdog</button>
      </article>
    )
  } else {
    return (
      <article>
        { <LoadingIndicator text="Loading Watchdogs" /> }
      </article>
    )
  }
}

export default Watchdogs;