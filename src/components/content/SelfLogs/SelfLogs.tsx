import { useEffect, useRef, useState } from 'react';
import { getSelfLogs } from '../../../fetchAPI.js';
import LoadingIndicator from '../../LoadingIndicator.jsx';

function SelfLogs() {

  // useState
  const loadingIndicator = (
  <tr key={0}>
    <td colSpan={3}><LoadingIndicator text="Loading logs" /></td>
  </tr>
  );
  const [logRows, setLogRows] = useState([loadingIndicator]);

  // useEffect ran twice workaround
  const effectRan = useRef(false);

  interface SelfLog {
    start: string | null;
    stop: string | null;
  }

  useEffect(() => {
    if (effectRan.current === false) { // useEffect ran twice workaround
      getSelfLogs()
        .then(selfLogs => {
          let jsxRows: Array<JSX.Element> = [];
          selfLogs.forEach((log: SelfLog, index: number) => {
            jsxRows.push(
              <tr key={ index }>
                <td className="good"  style={{textAlign: 'right'}}>{ log.start }</td>
                <td style={{textAlign: 'center'}}> --&gt; </td>
                <td className="bad"  style={{textAlign: 'left'}}>{ log.stop || <span className="good">Still running...</span> }</td>
              </tr>
            )
          })
          setLogRows(jsxRows);
        })
        .catch(error => {console.log(error)})

      // useEffect ran twice workaround
      return () => {
        effectRan.current = true;
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
          <th style={{textAlign: 'center'}}>--&gt;</th>
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

export default SelfLogs;
