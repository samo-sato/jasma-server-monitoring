import fetchAPI from '../../../fetchAPI'
import { useState } from 'react'

function Login(props) {

  const [msg, setMsg] = useState({
    text: '',
    cl: ''
  })

  function handleSubmit(e) {

    if (e.keyCode === 13 || e.type === 'click') {
      setMsg({
        text: 'Checking...',
        cl: ''
      })
      const inputString = document.getElementById('pw').value
      if (inputString.length > 0) {
        try {
          fetchAPI.login(inputString)
            .then(response => {
              if (response.authorized) { // login successful
                window.location.replace('/')
              } else {
                setMsg({
                  text: response.message,
                  cl: 'bad'
                })
              }
            })
        } catch (error) {
          setMsg({
            text: error,
            cl: 'bad'
          })
        }
      } else {
        setMsg({
          text: 'No password given',
          cl: 'bad'
        })
      }
    }
  }

  if (props.authorized === null) {
    return (
      <article>
        <p>Checking credentials...</p>
      </article>
    )
  } else {
    return (
      <article>
        <h1>User login</h1>
        <p>You are logged out, but you can login here:</p>
        <input id="pw" className="textInput" type="password" placeholder="password" onKeyUp={handleSubmit} />
        <button onClick={handleSubmit}>Login</button>
        <p className={msg.cl}>{msg.text}</p>
      </article>
    )
  }


}

export default Login
