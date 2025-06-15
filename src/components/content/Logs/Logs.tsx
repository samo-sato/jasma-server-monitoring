import { useEffect, useRef } from 'react';
import { useState } from 'react';
import LoadingIndicator from '../../LoadingIndicator.jsx';
import { getWatchdogs, getLogs } from '../../../fetchAPI.js';
import { generateStatusMsg, elementToggle, formatLocalDateTime, generateTableNote } from '../../../functions.jsx';

function Logs() {

  // React `useState` hook
  const [watchdogSelect, setWatchdogSelect] = useState<any>(<LoadingIndicator text="Loading items" />);
  const [statusMsg, setStatusMsg] = useState<string | JSX.Element>('');
  const [logTable, setLogTable] = useState(generateLogTable(null));

  interface Inputs {
    dFrom: React.RefObject<HTMLInputElement>;
    dTo: React.RefObject<HTMLInputElement>;
    status0: React.RefObject<HTMLInputElement>;
    status1: React.RefObject<HTMLInputElement>;
    watchdog: React.RefObject<HTMLSelectElement>;
  }

  // React `useRef` hook
  const inputs: Inputs = {
    dFrom: useRef(null),
    dTo: useRef(null), 
    status0: useRef(null),
    status1: useRef(null),
    watchdog: useRef(null)
  }; // Using it to get data from input fields
  const btnSearch = useRef(null); // Save button ref

  useEffect(() => {
    let isMounted = true;
    
    elementToggle.disable(btnSearch);
    getWatchdogs()
      .then(response => {
        if (!isMounted) return;
        
        let options: Array<JSX.Element> = [];
        response.forEach((watchdog: any) => {
          options.push(
            <option key={watchdog.id} value={watchdog.id}>
              {watchdog.name}
            </option>
          )
        })
        setWatchdogSelect(
          <select ref={inputs.watchdog} className="textInput">
            {options}
          </select>
        );
        if (btnSearch.current) {
          elementToggle.enable(btnSearch);
        }
      })
      .catch(error => {
        if (!isMounted) return;
        console.log(error);
      })

    return () => {
      isMounted = false;
    };
  }, [])

  function generateLogTable(data: any) {
    if (data) {
      let rows: any = [];
      data.forEach((row: any, index: any) => {
        let cName = row.status === 1 ? 'good' : (row.status === 0 ? 'bad' : ''); // Rows with `good` status will be different style than rows with "bad" status
        rows.push(
          <tr key={index} className={cName}>
            <td>{formatLocalDateTime(row.timestamp_start)}</td>
            <td>{formatLocalDateTime(row.timestamp_stop)}</td>
            <td>{row.watchdog}</td>
            <td>{row.status}</td>
            <td>{row.note}</td>
          </tr>
        )
      })

      return (
        <>
          <br />
          <table>
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Watchdog</th>
                <th>Status</th>
                <th style={{width:'45%'}}>Note</th>
              </tr>
            </thead>
            <tbody className="logTable">
              { rows }
            </tbody>
          </table>
        </>
      )
    } else {
      return <p><i>Results will appear here...</i></p>
    }
  }

  function handleSearch() {
    elementToggle.disable(btnSearch)
    setStatusMsg(<LoadingIndicator text="Loading logs" />)
    // Collecting user input data from input fields
    // And converting it to query string that will be used in API GET request
    let queryString = ''

      // Date constraint
      queryString += `?datefrom=${inputs.dFrom.current?.value}`;
      queryString += `&dateto=${inputs.dTo.current?.value}`;

      // Status constraints
      let st0 = inputs.status0.current?.checked ? 1 : 0;
      let st1 = inputs.status1.current?.checked ? 1 : 0;
      queryString += `&status0=${st0}`;
      queryString += `&status1=${st1}`;

      // Watchdog constraint
      let selectedWatchdog = inputs.watchdog.current?.value;
      queryString += `&watchdogs=${selectedWatchdog}`;

      // Initiating API call
      getLogs(queryString)
        .then(response => {
          setStatusMsg(generateStatusMsg(`${response.count} logs found...`, 'good'));
          setLogTable(generateLogTable(response.data));
          elementToggle.enable(btnSearch);
        })
        .catch(error => {
          let err = error ? error : 'Server error';
          setStatusMsg(generateStatusMsg(err, 'bad'));
          elementToggle.enable(btnSearch);
        });
  }

  // Get today date in following format "YYYY-MM-DD"
  function getToday() {
    const today = new Date(); // Create a new Date object with the current date

    // Get the year, month, and day from the Date object
    const year = today.getUTCFullYear();
    const month = String(today.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-indexed, so we add 1
    const day = String(today.getUTCDate()).padStart(2, '0');
    const todayFormatted = `${year}-${month}-${day}`; // Combine the year, month, and day into a single string in the desired format
    return todayFormatted;
  }

  return (
    <article>
      <h2>Logs</h2>
      <label htmlFor="fromDate">From </label>
      <input type="date" id="fromDate" ref={inputs.dFrom} defaultValue={getToday()} className="textInput" />
      <label htmlFor="toDate"> to </label>
      <input type="date" id="toDate" ref={inputs.dTo} defaultValue={getToday()} className="textInput" />
      <span> inclusive these dates</span>

      <br />
      <br />

      <span>With status: </span>
      <input type="checkbox" value="0" id="cStatus0" ref={inputs.status0} defaultChecked={true} />
      <label htmlFor="cStatus0">"0" offline</label>
      <span className="delimiter"></span>
      <input type="checkbox" value="1" id="cStatus1" ref={inputs.status1} defaultChecked={true} />
      <label htmlFor="cStatus1">"1" online</label>

      <p>Select Watchdog: </p>
      <div className="sameLine">
        { watchdogSelect }
      </div>
      <br />
      <button onClick={handleSearch} ref={btnSearch}>Search logs</button>
      <span className="marginLeft">
        { statusMsg }
      </span>
        { generateTableNote() }
      <div>
        { logTable }
      </div>
    </article>
  )
}

export default Logs;
