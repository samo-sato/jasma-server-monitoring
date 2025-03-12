import { useState, useRef, useEffect, MutableRefObject } from 'react';
import { updateSettings, getSettings } from '../../../fetchAPI.js';
import { generateStatusMsg, elementToggle } from '../../../functions.jsx';
import LoadingIndicator from '../../LoadingIndicator.jsx';

function Settings() {

  interface Inputs {
    email: MutableRefObject<any>;
    btnSave: MutableRefObject<any>;
  }

  // useState
  const [mainContent, setMainContent] = useState(<LoadingIndicator text="Loading settings" />);
  const [statusMsg, setStatusMsg] = useState<any>(null);

  // React `useRef` hook
  const inputs: Inputs = {
    email: useRef(null), // Using it to get data from input fields
    btnSave: useRef(null) // Save button ref
  }

  useEffect(() => {

      // Fetching current user's settings, it will be used in editable input fields as placeholders
      getSettings()
        .then(settings => {
          setMainContent(
            <>

              <div className="floatBlock">
                <div className="sameLine">
                  <span>Email address for alerts (optional)</span>
                </div>
              </div>

              <div className="floatBlock">
                <div className="sameLine">
                  <input ref={inputs.email} defaultValue={settings.email} className="textInput marginLeft" onKeyUp={handleSave} />
                </div>
              </div>
              
              <div className="clearfix">
              </div>
              
              { (settings.emailActive === 0 && settings.email !== null) && <p className="bad">Email is not activated, please open the activation link we have sent you before</p> }
              { settings.emailUnsubscribed && <p className="bad">This email address has been unsubscribed. Please choose a different email or opt for a non-email option.</p> }
              
              <button value="save" className="okBtn" ref={inputs.btnSave} onClick={handleSave}>
                Save changes
              </button>

            </>
          )
        })
        .catch(error => {
          console.log(error);
          console.log('Error while fetching settings from DB');
        })

  }, [])

  // Handle situation after user clicks "save" button
  function handleSave(e: any) {
    if (e.type === 'click' || e.keyCode === 13) { // Continue after user click on button

      setStatusMsg(<LoadingIndicator text="Saving changes" />);
      elementToggle.disable(inputs.btnSave);

      const newSettings = {
        email: inputs.email.current.value
      }

      updateSettings(newSettings)
        .then(response => {
          setStatusMsg(generateStatusMsg(response.data, 'good'));
          elementToggle.enable(inputs.btnSave);
        })
        .catch(error => {
          setStatusMsg(generateStatusMsg(error, 'bad'));
          elementToggle.enable(inputs.btnSave);
        })

    }

  }

  return (
    <article>
      <h1>Settings</h1>
      { mainContent }
      <div className="sameLine">{ statusMsg }</div>
    </article>
  )
}

export default Settings;