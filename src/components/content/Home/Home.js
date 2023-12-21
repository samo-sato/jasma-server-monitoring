import { useEffect } from 'react'
import { useState } from 'react'
import { getStats } from '../../../fetchAPI.js'
import { PARSE_INT_BASE, msToWords } from '../../../globals.js'
import LoadingIndicator from '../../LoadingIndicator.js'

function Home() {

  // react "useState" hook
  const [statsData, setStatsData] = useState(null)

  useEffect(() => {
    getStats() // fetch stats data
      .then(response => {
        setStatsData(response)
      })
      .catch(error => {
        console.log(error)
      })
  }, [])

  const readStats = {
    getEnabled: function () { // gets number of enabled Watchdogs
      return statsData.length
    },
    getOffline: function () { // gets number of Watchdogs signaling off-line status
      return statsData.filter(watchdog => watchdog.is_online === 0).length
    },
    getOnline: function () { // gets number of Watchdogs signaling on-line status
      return statsData.filter(watchdog => watchdog.is_online === 1).length
    }
  }

  if (statsData) {

    const cNameEnabled = readStats.getEnabled(statsData) === 0 ? "bad" : "good"
    const cNameOff     = readStats.getOffline(statsData) === 0 ? "good" : "bad"
    const cNameOn      = readStats.getOnline(statsData)  === 0 ? "bad" : "good"

    return (
      <article>
        <h1>Basic stats</h1>
        <p className={cNameEnabled}><b>{readStats.getEnabled(statsData)}</b> Watchdog(s) currently enabled</p>
        <p className={cNameOff}><b>{readStats.getOffline(statsData)}</b> Watchdog(s) signaling off-line status</p>
        <p className={cNameOn}><b>{readStats.getOnline(statsData)}</b> Watchdog(s) signaling on-line status</p>
        <p><i>Monitoring is executed every {msToWords(parseInt(process.env.REACT_APP_REPEAT_DELAY, PARSE_INT_BASE))}</i></p>
        <p><i>Refresh this page to update stats</i></p>
      </article>
    )
  } else {
    return (
      <article>
        { <LoadingIndicator text="Loading stats" /> }
      </article>
    )
  }
}

export default Home
