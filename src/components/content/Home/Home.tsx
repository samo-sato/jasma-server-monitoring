import { useEffect } from 'react';
import { useState } from 'react';
import { getStats } from '../../../fetchAPI.js';
import { serErr, refreshDelayShort, autorefreshNote, validateEnv, msToWords, toInt } from '../../../utils.js';
import LoadingIndicator from '../../LoadingIndicator.jsx';

// Validating environment variables
const REACT_APP_REPEAT_DELAY = validateEnv(process.env.REACT_APP_REPEAT_DELAY, true);
const monitoringIntervalNote = `Monitoring is executed every ${msToWords(toInt(REACT_APP_REPEAT_DELAY))}`; 

function Home() {

  // React `useState` hook
  const [statsData, setStatsData] = useState<any>(null);
  const [fetchError, setFetchError] = useState(false);

  const fetchStats = () => {
    getStats() // Fetch stats data
      .then(response => {
        setStatsData(response);
      })
      .catch(error => {
        setFetchError(true);
      })
  }

  useEffect(() => {

    fetchStats();

    // Using setInterval to achieve autorefresh of fetched data
    const intervalId = setInterval(() => {
      fetchStats();
    }, refreshDelayShort)

    return () => {
      clearInterval(intervalId);
    }

  }, [])

  if (!statsData) {
    return (
      <article>
        { <LoadingIndicator text="Loading stats" /> }
      </article>
    )
  }

  const readStats = {
    getOffline: function () { // Gets number of Watchdogs signaling off-line status
      return statsData.filter((watchdog: any) => watchdog.is_online === 0).length;
    },
    getOnline: function () { // Gets number of Watchdogs signaling on-line status
      return statsData.filter((watchdog: any) => watchdog.is_online === 1).length;
    }
  }

  if (fetchError) {
    return (
      <article>
        <p>{ serErr }</p>
      </article>
    )
  } else if (statsData) {

    const cNameOff = readStats.getOffline() === 0 ? "good" : "bad";
    const cNameOn = readStats.getOnline()  === 0 ? "bad" : "good";

    return (
      <article>
        <h1>Basic stats</h1>
        <p className={cNameOff}><b>{readStats.getOffline()}</b> Watchdog(s) signaling off-line status</p>
        <p className={cNameOn}><b>{readStats.getOnline()}</b> Watchdog(s) signaling on-line status</p>
        <p><i>{ monitoringIntervalNote }</i></p>
        <p><i>{ autorefreshNote }</i></p>
      </article>
    )
  } else {
    return (
      <article>
        <p>{ serErr }</p>
      </article>
    )
  }
}

export default Home;