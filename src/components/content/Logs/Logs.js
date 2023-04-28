import { useEffect, useRef } from 'react'
import { useState } from 'react'
import fetchAPI from '../../../fetchAPI'
import { generateStatusMsg, elementToggle } from '../../../functions'

function Logs() {

  // useEffect ran twice workaround
  const effectRan = useRef(false)

  // react "useState" hook
  const [watchdogCheckboxes, setWatchdogCheckboxes] = useState(<p>Loading watchdogs...</p>)
  const [statusMsg, setStatusMsg] = useState(null)
  const [logTable, setLogTable] = useState(generateLogTable(null))
  const [searchBtnText, setSearchBtnText] = useState('Loading...')

  // react "useRef" hook
  const inputs = {} // using it to get data from input fields
  inputs.dFrom = useRef(null)
  inputs.dTo = useRef(null)
  inputs.status0 = useRef(null)
  inputs.status1 = useRef(null)
  const btnSave = useRef(null) // save button ref

  // default text for search button
  const defaultBtnText = 'Search'

  useEffect(() => {
    if (effectRan.current === false) { // useEffect ran twice workaround
      elementToggle.disable(btnSave)
      fetchAPI.getWatchdogs()
        .then(response => {
          let watchdogCheckboxes = []
          response.forEach((watchdog, index) => {
            watchdogCheckboxes.push(
              <div key={index}>
                <input type="checkbox" id={`wc${index}`} value={watchdog.id} className="wc" defaultChecked={true} />
                <label htmlFor={`wc${index}`}>{watchdog.name}</label>
              </div>
            )
          })
          setWatchdogCheckboxes(watchdogCheckboxes)
          elementToggle.enable(btnSave)
          setSearchBtnText(defaultBtnText)
        })
        .catch(error => {console.log(error)})

      // useEffect ran twice workaround
      return () => {
        effectRan.current = true
      }
    }

  }, [])

  function shorten(string) {
    let newLength = 25
    let dots = string.length > newLength ? '[...]' : ''
    let shortened = `${string.slice(0, newLength)}${dots}`
    return <span title={string}>{shortened}</span>
  }

  function generateLogTable(data) {
    if (data) {

      let rows = []
      data.forEach((row, index) => {
        let cName = row.status === 1 ? 'good' : (row.status === 0 ? 'bad' : '') // rows with "good" status will be different style than rows with "bad" status
        rows.push(
          <tr key={index} className={cName}>
            <td>{row.id}</td>
            <td>{row.datetime}</td>
            <td>{row.watchdog}</td>
            <td>{row.status}</td>
            <td>{shorten(row.note)}</td>
          </tr>
        )
      })

      return (
        <>
          <br />
          <table>
            <thead>
              <tr>
                <td>Log ID</td>
                <td>Date</td>
                <td>Watchdog</td>
                <td>Status</td>
                <td>Note</td>
              </tr>
            </thead>
            <tbody>
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

    elementToggle.disable(btnSave)
    setSearchBtnText('Searching...')

    // collecting user input data from input fields
    // and converting it to query string that will be used in API GET request
    let queryString = ''

      // date constraint
      queryString += `?datefrom=${inputs.dFrom.current.value}`
      queryString += `&dateto=${inputs.dTo.current.value}`

      // status constraints
      let st0 = inputs.status0.current.checked ? 1 : 0
      let st1 = inputs.status1.current.checked ? 1 : 0
      queryString += `&status0=${st0}`
      queryString += `&status1=${st1}`

      // watchdogs constraints

        // convert html list of Watchdog checkboxes to javascript array with checked only Watchdogs
        let checkedWatchdogs = []
        document.querySelectorAll('.wc').forEach(item => {
          if (item.checked) {
            checkedWatchdogs.push(item.value)
          }
        })

        // adding checked watchdogs to query string (id's separated by comma)
        let list = ''
        for (let i = 0; i < checkedWatchdogs.length; i++) {
          let separator = (i+1) === checkedWatchdogs.length ? '' : ','
          list += `${checkedWatchdogs[i]}${separator}`
        }
        queryString += `&watchdogs=${list}`

      // initiating API call
      fetchAPI.getLogs(queryString)
        .then(response => {
          setStatusMsg(generateStatusMsg(`${response.count} logs found...`, 'good'))
          setLogTable(generateLogTable(response.data))
          setSearchBtnText(defaultBtnText)
          elementToggle.enable(btnSave)
        })
        .catch(error => {
          let err = error ? error : 'Server error'
          setStatusMsg(generateStatusMsg(err, 'bad'))
          setSearchBtnText(defaultBtnText)
          elementToggle.enable(btnSave)
        })

  }

  // get today date in following format "YYYY-MM-DD"
  function getToday() {
    const today = new Date() // Create a new Date object with the current date

    // Get the year, month, and day from the Date object
    const year = today.getUTCFullYear()
    const month = String(today.getUTCMonth() + 1).padStart(2, '0') // Months are zero-indexed, so we add 1
    const day = String(today.getUTCDate()).padStart(2, '0')
    const todayFormatted = `${year}-${month}-${day}` // Combine the year, month, and day into a single string in the desired format
    return todayFormatted
  }

  // select/unselect all Watchdog checkboxes
  function selectAll(e) {
    document.querySelectorAll('.wc').forEach(item => {
      item.checked = (e.target.checked) ? true : false
    })
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
      <>
        <div>
          <input type="checkbox" id="wcsa" defaultChecked={true} onClick={selectAll} />
          <label htmlFor="wcsa">select/unselect all</label>
        </div>
        <br />
          { watchdogCheckboxes }
      </>

      <br />

      <button onClick={handleSearch} ref={btnSave}>{searchBtnText}</button>

      { statusMsg }
      { logTable }

    </article>
  )
}

export default Logs
