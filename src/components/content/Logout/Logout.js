import { useRef, useState, useEffect } from 'react'
import fetchAPI from '../../../fetchAPI'

function Logout() {

  // useState
  const [pageContent, setPageContent] = useState(null)

  // useEffect workaround
  const effectRan = useRef(false)
  useEffect(() => {
    if (effectRan.current === false) {

      // setting relevant page content while logout functionality executes
      setPageContent(<p>Logging out in progress...</p>)

      // logout funcionality
      fetchAPI.authorized() // first check if user is not already logged out
        .then(response => {
          fetchAPI.logout() // logout function
            .then(response => {
              window.location.replace('/')
              console.log('User logged out successfuly')
              setPageContent(<p>Log out successful</p>)
            })
            .catch(error => {
              console.log(error)
              console.log('Logout error')
            })
        })
        .catch(error => {
          console.log(error)
          console.log('User was propably already logged out')
          window.location.replace('/')
        })

      return () => {
        effectRan.current = true
      }
    }

  }, [])

  return (
    <article>
      {pageContent}
    </article>
  )
}

export default Logout
