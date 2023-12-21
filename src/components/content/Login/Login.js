import { login, register } from '../../../fetchAPI.js'
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { elementToggle, generateStatusMsg } from '../../../functions.js'
import LoadingIndicator from '../../LoadingIndicator.js'



function Login(props) {

  const navigate = useNavigate()

  const btnLogin = useRef(null) // <button> for login existing user
  const btnAntibot = useRef(null) // <button> for creating new account
  const inpAnswer = useRef(null) // <input> with antibot answer

  const [statusLogin, setStatusLogin] = useState('')
  const [statusRegister, setStatusRegister] = useState('')
  const [registerForm, setRegisterForm] = useState(
    <button onClick={handleAntibot} ref={btnAntibot} >Get account, no email required</button>
  )

  function handleLogin(e) {

    if (e.keyCode === 13 || e.type === 'click') {

      elementToggle.disable(btnLogin)

      setStatusLogin(<LoadingIndicator text="Logging" />)

      const inputString = document.getElementById('pw').value
      if (inputString.length > 0) {

      login(inputString)
        .then(response => {
          if (response.authenticated) {
            props.onLogin(response.uuid, response.time)
            navigate('/')
          } else {
            elementToggle.enable(btnLogin)
            setStatusLogin(generateStatusMsg(response.message, 'bad'))
          }
        })
      .catch(error => {
        elementToggle.enable(btnLogin)
        setStatusLogin(generateStatusMsg(error, 'bad'))
      })

      } else {
        elementToggle.enable(btnLogin)
        setStatusLogin(generateStatusMsg('No password given', 'bad'))
      }
    }
  }

  // ...
  function handleAntibot() {
    // btnAntibot.current

    setRegisterForm(
      <>
        <p>Antibot: how many legs does a dog have if one leg missing?</p>
        <input className="textInput" ref={inpAnswer} onKeyUp={handleRegister} />
        <button className="marginLeft" onClick={handleRegister} ref={btnAntibot}>Check answer</button>
      </>
    )
  }

  function handleRegister(e) {

    if (e.keyCode === 13 || e.type === 'click') {
      elementToggle.disable(btnAntibot)
      setStatusRegister(<LoadingIndicator text="Creating account" />)
      register(inpAnswer.current.value)
        .then(response => {
          if (response.authenticated) { // created account and logged in
            props.onRegister(response.uuid, response.password, response.time)
            navigate('/new')
          } else {
            elementToggle.enable(btnAntibot)
            setStatusRegister(generateStatusMsg(response.message, 'bad'))
          }
        })
        .catch(error => {
          elementToggle.enable(btnAntibot)
          setStatusRegister(generateStatusMsg(error.message, 'bad'))
        })

    }

  }

  return (
    <article>

      <div>

        <div className="floatBlock" style={{ width: '50%' }}>
          <h1>User login</h1>
          <input id="pw" className="textInput" type="password" placeholder="password" onKeyUp={handleLogin} />
          <button onClick={handleLogin} className="marginLeft" ref={btnLogin}>Login</button>
          <div className="sameLine">{statusLogin}</div>
        </div>

        <div className="floatBlock">
          <h1>Create demo account</h1>
          <div id="newAccountForm">
            { registerForm }
          </div>
          <div className="sameLine">{statusRegister}</div>
        </div>

        <div className="clearfix">

        </div>

      </div>

    </article>
  )

}

export default Login
