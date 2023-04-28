import { useEffect, useRef, useState } from 'react'
import fetchAPI from '../../../fetchAPI'

function SelfLogs() {

  // useState
  const [logRows, setLogRows] = useState(
    <tr>
      <td colSpan="3">Loading logs...</td>
    </tr>
  )

  // useEffect ran twice workaround
  const effectRan = useRef(false)

  useEffect(() => {
    if (effectRan.current === false) { // useEffect ran twice workaround
      fetchAPI.getSelfLogs()
        .then(selfLogs => {
          let jsxRows = []
          selfLogs.forEach((log, index) => {
            jsxRows.push(
              <tr key={ index }>
                <td className="good"  style={{textAlign: 'right'}}>{ log.start }</td>
                <td style={{textAlign: 'center'}}> --> </td>
                <td className="bad"  style={{textAlign: 'left'}}>{ log.stop }</td>
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
      <p>These logs show app backend running/not-running time periods.</p>
      <table>
      <thead>
        <tr>
          <th style={{textAlign: 'right'}}>Started at</th>
          <th style={{textAlign: 'center'}}>--></th>
          <th style={{textAlign: 'left'}}>Stopped at</th>
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
