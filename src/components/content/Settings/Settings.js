import { useState, useRef, useEffect } from 'react'
import fetchAPI from '../../../fetchAPI'
import { generateStatusMsg, elementToggle, generateHelp } from '../../../functions'

function Settings() {

  // useState
  const [mainContent, setMainContent] = useState(<p>Loading data...</p>)
  const [statusMsg, setStatusMsg] = useState(null)

  // react "useRef" hook
  const inputs = {} // using it to get data from input fields
  inputs.scanning_interval = useRef(null)
  inputs.token_expiration = useRef(null)
  const btnSave = useRef(null) // save button ref

  // useEffect ran twice workaround
  const effectRan = useRef(false)
  useEffect(() => {
    if (effectRan.current === false) {

      // fetching current app parameters, it will be used in editable input fields as placeholders
      fetchAPI.getParams()
        .then(params => {

          // options elements for selectobxes where user selects number of seconds as input values
          let secondOoptions = []
          let seconds = [10, 20, 30, 60, 120, 180, 300, 600, 1800, 3600, 14400]
          seconds.forEach((value, index) => {
            secondOoptions.push(<option value={value*1000} key={index}>{value}</option>)
          })

          // ...
          let minuteOptions = []
          let minutes = [1, 5, 10, 30, 60, 240, 480, 1440, 10080]
          minutes.forEach((value, index) => {
            minuteOptions.push(<option value={value*60} key={index}>{value}</option>)
          })

          setMainContent(
            <>

              <div className="floatBlock">
                <div className="sameLine">
                  <span>Scanning interval</span>
                </div>
                <div className="sameLine">
                  <span>Login token duration</span>
                </div>
              </div>

              <div className="floatBlock">
                <div className="sameLine">
                  <select className="sideMargin" ref={inputs.scanning_interval} defaultValue={params.scanning_interval}>
                    {secondOoptions}
                  </select>
                  <span>seconds{generateHelp('The "scanning interval" parameter refers to the time duration, measured in seconds, between consecutive server monitoring checks, allowing the user to adjust how frequently the server\'s status is monitored.')}</span>
                </div>
                <div className="sameLine">
                  <select className="sideMargin" ref={inputs.token_expiration} defaultValue={params.token_expiration}>
                    {minuteOptions}
                  </select>
                  <span>minutes{generateHelp('Set the automatic log-out time for the user. The changes will take effect upon the user\'s next log-in.')}</span>
                </div>
              </div>

              <div className="clearfix">
              </div>

              <button value="save" className="okBtn" ref={btnSave} onClick={handleSave}>
                Save changes
              </button>

            </>
          )
        })
        .catch(error => {
          console.log(error)
          console.log('Error while fetching parameters from DB')
        })

      return () => {
        effectRan.current = true
      }
    }

  })

  // handle situation after user clicks "save" button
  function handleSave(e) {

    if (e.type === 'click') { // continue after user click on button

      setStatusMsg(generateStatusMsg('Please wait...'))
      elementToggle.disable(btnSave)

      const newParams = {
        scanning_interval: inputs.scanning_interval.current.value,
        token_expiration: inputs.token_expiration.current.value
      }

      fetchAPI.updateParams(newParams)
        .then(response => {
          setStatusMsg(generateStatusMsg(response.data, 'good'))
          elementToggle.enable(btnSave)
        })
        .catch(error => {
          let err = error ? error : 'Server error'
          setStatusMsg(generateStatusMsg(err, 'bad'))
          elementToggle.enable(btnSave)
        })
    }

  }

  return (
    <article>
      <h1>Settings</h1>
      { mainContent }
      { statusMsg }
    </article>
  )
}

export default Settings
