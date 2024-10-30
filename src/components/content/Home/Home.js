import { useEffect } from 'react'
import { useState } from 'react'
import { getStats } from '../../../fetchAPI.js'
import { refreshDelayShort, monitoringIntervalNote, autorefreshNote, serErr } from '../../../globals.js'
import LoadingIndicator from '../../LoadingIndicator.js'

function Home() {

  // react "useState" hook
  const [statsData, setStatsData] = useState(null)
  const [fetchError, setFetchError] = useState(false)

  const fetchStats = () => {
    getStats() // fetch stats data
      .then(response => {
        setStatsData(response)
      })
      .catch(error => {
        setFetchError(true)
      })
  }

  useEffect(() => {

    fetchStats()

    // using setInterval to achieve autorefresh of fetched data
    const intervalId = setInterval(() => {
      fetchStats()
    }, refreshDelayShort)

    return () => {
      clearInterval(intervalId)
    }

  }, [])

  const readStats = {
    getOffline: function () { // gets number of Watchdogs signaling off-line status
      return statsData.filter(watchdog => watchdog.is_online === 0).length
    },
    getOnline: function () { // gets number of Watchdogs signaling on-line status
      return statsData.filter(watchdog => watchdog.is_online === 1).length
    }
  }

  if (fetchError) {
    return (
      <article>
        <p>{ serErr }</p>
      </article>
    )
  } else if (statsData) {

    const cNameOff     = readStats.getOffline(statsData) === 0 ? "good" : "bad"
    const cNameOn      = readStats.getOnline(statsData)  === 0 ? "bad" : "good"

    return (
      <article>
        <h1>Basic stats</h1>
        <p className={cNameOff}><b>{readStats.getOffline(statsData)}</b> Watchdog(s) signaling off-line status</p>
        <p className={cNameOn}><b>{readStats.getOnline(statsData)}</b> Watchdog(s) signaling on-line status</p>
        <p><i>{ monitoringIntervalNote }</i></p>
        <p><i>{ autorefreshNote }</i></p>
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
