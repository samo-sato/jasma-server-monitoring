import { useEffect, useRef } from 'react'
import { useState } from 'react'
import fetchAPI from '../../../fetchAPI'

function Home() {

  // useEffect ran twice workaround
  const effectRan = useRef(false)

  // react "useState" hook
  const [statsData, setStatsData] = useState(null)

  useEffect(() => {
    if (effectRan.current === false) { // useEffect ran twice workaround
      fetchAPI.getStats()
        .then(response => {
          setStatsData(response)
        })
        .catch(error => {
          throw new Error(error)
        })


      // useEffect ran twice workaround
      return () => {
        effectRan.current = true
      }
    }

  }, [])

  const readStats = {
    getEnabled: function () {
      return statsData.length
    },
    getOffline: function () {
      return statsData.filter(watchdog => watchdog.is_online === 0).length
    },
    getOnline: function () {
      return statsData.filter(watchdog => watchdog.is_online === 1).length
    }
  }

  if (statsData) {
    return (
      <article>
        <h1>Some basic stats</h1>
        <p><b>{readStats.getEnabled(statsData)}</b> watchdogs currently enabled</p>
        <p><b>{readStats.getOffline(statsData)}</b> watchdogs signaling off-line status</p>
        <p><b>{readStats.getOnline(statsData)}</b> watchdogs signaling on-line status</p>
        <p><i>Refresh this page to update stats</i></p>
      </article>
    )
  } else {
    return (
      <article>
        <p>Loading stats</p>
      </article>
    )
  }
}

export default Home
