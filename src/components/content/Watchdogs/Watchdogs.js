import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import List from './List.js'
import LoadingIndicator from '../../LoadingIndicator.js'
import { PARSE_INT_BASE, msToWords } from '../../../globals.js'
import { generateStatusMsg } from '../../../functions.js'
import { getWatchdogs } from '../../../fetchAPI.js'

// textual hints used in another components
export const activeUrlName = 'Endpoint URL'
export const passiveUrlName = 'Snoozing URL'
export const passiveUrlHelp = `The monitored service must request this URL at least every ${msToWords(parseInt(process.env.REACT_APP_REPEAT_DELAY, PARSE_INT_BASE))} to maintain its status.`
export const activeUrlHelp = `The Watchdog will check this URL every ${msToWords(parseInt(process.env.REACT_APP_REPEAT_DELAY, PARSE_INT_BASE))}. If the response code falls within 2xx range, we'll flag the monitored service as online. Any other status code or error will flag the monitored server as offline.`
export const notifHelp = `For this feature to work, you need to save a valid email address in your Settings and follow instructions regarding email activation.
Watchdog state is evaluated every ${msToWords(parseInt(process.env.REACT_APP_REPEAT_DELAY, PARSE_INT_BASE))}`

function Watchdogs() {

  // react "useState" hook
  const [watchdogsData, setWatchdogsData] = useState(null)
  const [message, setMessage] = useState(null)

  // react "useNavigate" hook
  const navigate = useNavigate()

  // react "useLocation" hook
  const location = useLocation()

  useEffect(() => {
      getWatchdogs()
        .then(response => {
          setWatchdogsData(response)
        })
        .catch(error => {console.log(error)})

      if (location.state) {
        setMessage(generateStatusMsg(location.state.message, 'good'))
      }

  }, [])

  function handleAdd(e) {
    navigate('/add-watchdog')
  }

  if (watchdogsData) {
    return (
      <article>
        <h1>Watchdogs</h1>
        <p><i>Refresh this page to update data</i></p>
        <List watchdogs={watchdogsData} />
        <div>
          {message}
        </div>
        <br />
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

export default Watchdogs
