import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingIndicator from '../../LoadingIndicator.js'
import { generateStatusMsg } from '../../../functions.js'
import { logout } from '../../../fetchAPI.js'

function Logout(props) {

  const navigate = useNavigate()

  // useState
  const [pageContent, setPageContent] = useState(null)

  useEffect(() => {

      // setting relevant page content while logout functionality executes
      setPageContent(<LoadingIndicator text="Logging out" />)

      // logout funcionality
      logout() // logout function
        .then(response => {
          props.onLogout()
          navigate('/login')
        })
        .catch(error => {
          setPageContent(generateStatusMsg('Logout failed', 'bad'))
        })

  }, [])

  return (
    <article>
      {pageContent}
    </article>
  )
}

export default Logout
