import { useEffect, useRef, useState } from 'react'
import { getSelfLogs } from '../../../fetchAPI.js'
import LoadingIndicator from '../../LoadingIndicator.js'

function SelfLogs() {

  // useState
  const [logRows, setLogRows] = useState(
    <tr>
      <td colSpan="3"><LoadingIndicator text="Loading logs" /></td>
    </tr>
  )

  // useEffect ran twice workaround
  const effectRan = useRef(false)

  useEffect(() => {
    if (effectRan.current === false) { // useEffect ran twice workaround
      getSelfLogs()
        .then(selfLogs => {
          let jsxRows = []
          selfLogs.forEach((log, index) => {
            jsxRows.push(
              <tr key={ index }>
                <td className="good"  style={{textAlign: 'right'}}>{ log.start }</td>
                <td style={{textAlign: 'center'}}> --> </td>
                <td className="bad"  style={{textAlign: 'left'}}>{ log.stop || <span className="good">Still running...</span> }</td>
              </tr>
            )
          })
          setLogRows(jsxRows)
        })
        .catch(error => {console.log(error)})

      // useEffect ran twice workaround
      return () => {
        effectRan.current = true
      }
    }

  }, [])

  return (
    <article>
      <h1>Self logs</h1>
      <p>These logs show app backend <span className="good">running</span> / <span className="bad">not-running</span> time periods.</p>
      <p>Any gap in self-logs would be caused by one of the following:</p>
      <ul>
        <li key={1}>This app was not-running</li>
        <li key={2}>The server hosting this app lost its internet connection</li>
      </ul>
      <table>
      <thead>
        <tr>
          <th style={{textAlign: 'right'}}>Started</th>
          <th style={{textAlign: 'center'}}>--></th>
          <th style={{textAlign: 'left'}}>Stopped</th>
        </tr>
      </thead>
        <tbody>
          { logRows }
        </tbody>
      </table>
    </article>
  )
}

export default SelfLogs
