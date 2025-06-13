import { useEffect, useRef } from 'react';
import { useState } from 'react';
import LoadingIndicator from '../../LoadingIndicator.jsx';
import { getWatchdogs, getLogs } from '../../../fetchAPI.js';
import { generateStatusMsg, elementToggle } from '../../../functions.jsx';

function Logs() {

  // React `useState` hook
  const [watchdogCheckboxes, setWatchdogCheckboxes] = useState<any>(<LoadingIndicator text="Loading items" />);
  const [statusMsg, setStatusMsg] = useState<string | JSX.Element>('');
  const [logTable, setLogTable] = useState(generateLogTable(null));

  interface Inputs {
    dFrom: React.RefObject<HTMLInputElement>;
    dTo: React.RefObject<HTMLInputElement>;
    status0: React.RefObject<HTMLInputElement>;
    status1: React.RefObject<HTMLInputElement>;
  }

  // React `useRef` hook
  const inputs: Inputs = {
    dFrom: useRef(null),
    dTo: useRef(null), 
    status0: useRef(null),
    status1: useRef(null)
  }; // Using it to get data from input fields
  const btnSearch = useRef(null); // Save button ref

  useEffect(() => {
    let isMounted = true;
    
    elementToggle.disable(btnSearch);
    getWatchdogs()
      .then(response => {
        if (!isMounted) return;
        
        let watchdogCheckboxes: Array<JSX.Element> = [];
        response.forEach((watchdog: any, index: number) => {
          watchdogCheckboxes.push(
            <div key={index}>
              <input type="checkbox" id={`wc${index}`} value={watchdog.id} className="wc" defaultChecked={true} />
              <label htmlFor={`wc${index}`}>{watchdog.name}</label>
            </div>
          )
        })
        setWatchdogCheckboxes(watchdogCheckboxes);
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
            <td>{row.datetime_start}</td>
            <td>{row.datetime_stop}</td>
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
                <td>From</td>
                <td>To</td>
                <td>Watchdog</td>
                <td>Status</td>
                <td style={{width:'45%'}}>Note</td>
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

      // Watchdogs constraints

        // convert html list of Watchdog checkboxes to javascript array with checked only Watchdogs
        let checkedWatchdogs: Array<string> = [];
        document.querySelectorAll('.wc').forEach((item) => {
          if ((item as HTMLInputElement).checked) {
            checkedWatchdogs.push((item as HTMLInputElement).value);
          }
        });

        // Adding checked watchdogs to query string (id's separated by comma)
        let list = '';
        for (let i = 0; i < checkedWatchdogs.length; i++) {
          let separator = (i+1) === checkedWatchdogs.length ? '' : ','
          list += `${checkedWatchdogs[i]}${separator}`
        }
        queryString += `&watchdogs=${list}`;

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

  // Select / unselect all Watchdog checkboxes
  function selectAll(e: any) {
    document.querySelectorAll('.wc').forEach(item => {
      (item as HTMLInputElement).checked = (e.target.checked) ? true : false;
    });
  }

  return (
    <article>
      <h1>Logs</h1>
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

      <p>Watchdog association: </p>
        <div>
          <input type="checkbox" id="wcsa" defaultChecked={true} onClick={selectAll} />
          <label htmlFor="wcsa">select/unselect all</label>
        </div>
        <div className="sameLine">
          { watchdogCheckboxes }
        </div>
      <br />
      <button onClick={handleSearch} ref={btnSearch}>Search logs</button>
      <span className="marginLeft">
        { statusMsg }
      </span>
      <br />
      <div>
        { logTable }
      </div>
    </article>
  )
}

export default Logs;
