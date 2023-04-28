import './general.css'
import Header from './components/Header'
import Footer from './components/Footer'
import Login from './components/content/Login/Login'
import Logout from './components/content/Logout/Logout'
import Home from './components/content/Home/Home'
import Watchdogs from './components/content/Watchdogs/Watchdogs'
import EditOrAdd from './components/content/Watchdogs/EditOrAdd'
import Logs from './components/content/Logs/Logs'
import SelfLogs from './components/content/SelfLogs/SelfLogs'
import Settings from './components/content/Settings/Settings'
import NoPage from './components/NoPage'
import fetchAPI from './fetchAPI'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import { useCookies } from 'react-cookie'

// data about pages (used in react router, menu items, html titles, etc...)
const pages = [
  {
    slug: '', // used in URL
    name: 'Home', // used in menu
    description: 'Home page with quick stats', // used in page title
    component: <Home />, // main react component of this page
    homePage: true, // it is homepage itself
    menuItem: true, // it is included in menu (as menu item)
    auth: true // page requires login
  },
  {
    slug: 'watchdogs',
    name: 'Watchdogs',
    description: 'Watchdogs overview',
    component: <Watchdogs />,
    homePage: false,
    menuItem: true,
    auth: true
  },
  {
    slug: 'logs',
    name: 'Logs',
    description: 'Status logs of monitored services',
    component: <Logs />,
    homePage: false,
    menuItem: true,
    auth: true
  },
  {
    slug: 'self-logs',
    name: 'Self logs',
    description: 'Status logs of itself',
    component: <SelfLogs />,
    homePage: false,
    menuItem: true,
    auth: true
  },
  {
    slug: 'settings',
    name: 'Settings',
    description: 'General settings',
    component: <Settings />,
    homePage: false,
    menuItem: true,
    auth: true
  },
  {
    slug: '404-no-page',
    name: 'No content here',
    description: '404 error - this page should not exist',
    component: <NoPage />,
    homePage: false,
    menuItem: false,
    auth: false
  },
  {
    slug: 'login',
    name: 'Login',
    description: 'Login page',
    component: <Login />,
    homePage: false,
    menuItem: true,
    auth: false
  },
  {
    slug: 'logout',
    name: 'Logout',
    description: 'Logout page',
    component: <Logout />,
    homePage: false,
    menuItem: true,
    auth: true
  }
]

// root react component
// all "page" components arenested inside
function App() {

  // react states
  const [themeStyle, setThemeStyle] = useState('light') // currently set theme style: light OR dark
  const [themeMode, setThemeMode] = useState('light') // currently selected theme mode: light OR dark OR auto
  const [authorized, setAuthorized] = useState(null) // is user logged in or not
  const [serverTime, setServerTime] = useState('[unknown]') // server time info for user

  // cookies
  const [cookies, setCookie] = useCookies(['themeSettings']) // cookies used to save selected theme mode

  // toggling between theme styles based on selected "themeMode" state variable
  function themeToggle() {

    switch (themeMode) {

      case 'light': // current mode is "light" and switching to "dark"
        setThemeByMode('dark')
      break

      case 'dark': // current mode is "dark" and switching to "auto"
        setThemeByMode('auto')
      break

      case 'auto': // current mode is "auto" and switching to "light"
        setThemeByMode('light')
      break

      default:
        setThemeByMode('light')
    }

  }

  // set particular theme mode
  function setThemeByMode(mode) {

    // set theme 'auto' by default if no theme cookie exists yet
    if (mode === undefined) {
      mode = 'auto'
    }

    // preparing data for theme cookie
    const cookieOptions = {
      sameSite: true,
      maxAge: 3600 * 24 * 30 * 1000
    }
    const cookieName = 'themeMode'
    const bodyBgColor = {
      light: '#C4D7E0',
      dark: '#2C3333'
    }

    // switch between theme modes and set theme styles
    switch (mode) {

      // note:
      // body background color has to be "manually" changed here, all other styling is changed more elegantly by just applying different style calsses
      // the reason is that body element is outside of react root element
      // yes, it can be done more elegantly, maybe later...

      case 'light':
        setThemeStyle('light')
        setThemeMode('light')
        setCookie(cookieName, 'light', cookieOptions)
        document.body.style.backgroundColor = bodyBgColor.light
      break

      case 'dark':
        setThemeStyle('dark')
        setThemeMode('dark')
        setCookie(cookieName, 'dark', cookieOptions)
        document.body.style.backgroundColor = bodyBgColor.dark
      break

      case 'auto': // time based theme selection
        const date = new Date()
        let style
        if (date.getHours() > 8 && date.getHours() < 20) {
          // light
          style = 'light'
          document.body.style.backgroundColor = bodyBgColor.light
        } else {
          // dark
          style = 'dark'
          document.body.style.backgroundColor = bodyBgColor.dark
        }
        setThemeStyle(style)
        setThemeMode('auto')
        setCookie(cookieName, 'auto', cookieOptions)
      break

      default:
        setThemeStyle('light')
        setThemeMode('light')
        document.body.style.backgroundColor = bodyBgColor.light
    }

  }

  // ***************************************************************************
  // useEffect ran twice workaround TEMPLATE

    // import { useRef, useEffect } from 'react'
    // const effectRan = useRef(false)
    // useEffect(() => {
    //   console.log(effectRan.current)
    //   if (effectRan.current === false) {
    //
    //     // code to execute goes here...
    //     // ...
    //
    //     return () => {
    //       effectRan.current = true
    //     }
    //   }
    //
    // }, [])

  // ***************************************************************************

  // useEffect ran twice workaround
  const effectRan = useRef(false)

  useEffect(() => {
    if (effectRan.current === false) { // useEffect ran twice workaround

      // set theme from based on cookie (if exists)
      setThemeByMode(cookies.themeMode)

      // determines if user is logged in
        fetchAPI.authorized()
          .then(response => {
            if (response.authorized) {
              console.log('user is logged in')
              setAuthorized(true)
              setServerTime(response.time)
            } else {
              console.log('error during authentication')
              setAuthorized(false)
            }
          })
          .catch(error => { // user is not logged in
            console.log('user is not logged in')
            setAuthorized(false)
            let loginPagePath = '/login'
            if (window.location.pathname !== loginPagePath && window.location.pathname !== "/") { // if unauthorized user landed on restricted url, redirect him to login page
              window.location.replace(loginPagePath)
            }
          })


      // useEffect ran twice workaround
      return () => {
        effectRan.current = true
      }
    }

  })

    return (
        <div className="App" id={themeStyle}> {/* id is for switching between dark/light modes */}
          <BrowserRouter>
            <Header themeProps={{ themeStyle, themeMode, themeToggle }} authorized={authorized} />

                <>
                <Routes>
                  <Route path="/" >

                  {
                    authorized
                    ?
                      <>
                        {/* if user is logged in */}
                        <Route index element={<Home />} />
                        <Route path="watchdogs" >
                          <Route index element={<Watchdogs />} />
                          <Route path=":watchdogId" element={<EditOrAdd add={false}  />} />
                        </Route>
                        <Route path="add-watchdog" element={<EditOrAdd adding={true}  />} />
                        <Route path="logs" element={<Logs />} />
                        <Route path="self-logs" element={<SelfLogs />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="logout" element={<Logout />} />
                        <Route path="*" element=<NoPage /> />
                      </>
                    :
                      <>
                        {/* if user is NOT logged in */}
                        <Route path="/" element={<Login authorized={authorized} />} />
                        <Route path="/*" element={<Login authorized={authorized} />} />
                      </>
                  }

                  </Route>
                </Routes>
                </>

            <Footer time={serverTime} authorized={authorized} />
          </BrowserRouter>
        </div>
    )

}

export { pages }
export default App
