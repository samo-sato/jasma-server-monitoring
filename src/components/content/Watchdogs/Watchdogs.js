import { useEffect, useRef } from 'react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { generateStatusMsg } from '../../../functions'
import List from './List'
import fetchAPI from '../../../fetchAPI'

function Watchdogs() {

  // useEffect ran twice workaround
  const effectRan = useRef(false)

  // react "useState" hook
  const [watchdogsData, setWatchdogsData] = useState(null)
  const [watchdogDeleted, setWatchdogDeleted] = useState(null)

  // react "useNavigate" hook
  const navigate = useNavigate()

  // react "useLocation" hook
  const location = useLocation()

  useEffect(() => {
    if (effectRan.current === false) { // useEffect ran twice workaround
      fetchAPI.getWatchdogs()
        .then(response => {
          setWatchdogsData(response)
        })
        .catch(error => {console.log(error)})

      if (location.state) {
        setWatchdogDeleted(generateStatusMsg(location.state.watchdogDeleted, 'good'))
      }

      // useEffect ran twice workaround
      return () => {
        effectRan.current = true
      }
    }

  }, [location.state])

  function handleClick(e) {
    navigate('/add-watchdog')
  }

  if (watchdogsData) {
    return (
      <article>
        <h1>Watchdogs</h1>
        <p><i>Refresh this page to update data</i></p>
        <List watchdogs={watchdogsData} />
        <div className="sameLine">
          {watchdogDeleted}
        </div>
        <br />
        <button onClick={handleClick}>Add new Watchdog</button>
      </article>
    )
  } else {
    return (
      <article>
        <p>Loading watchdog items</p>
      </article>
    )
  }
}

export default Watchdogs
