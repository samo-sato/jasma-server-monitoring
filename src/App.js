import { useState, useEffect } from 'react'
import { useCookies } from 'react-cookie'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header.js'
import Footer from './components/Footer.js'
import Login from './components/content/Login/Login.js'
import Logout from './components/content/Logout/Logout.js'
import Home from './components/content/Home/Home.js'
import Watchdogs from './components/content/Watchdogs/Watchdogs.js'
import Edit from './components/content/Watchdogs/Edit.js'
import Add from './components/content/Watchdogs/Add.js'
import Logs from './components/content/Logs/Logs.js'
import SelfLogs from './components/content/SelfLogs/SelfLogs.js'
import Settings from './components/content/Settings/Settings.js'
import New from './components/content/New/New.js'
import NoPage from './components/NoPage.js'
import LoadingIndicator from './components/LoadingIndicator.js'
import { PARSE_INT_BASE } from './globals.js'
import { isAuthenticated } from './fetchAPI.js'
import { generateStatusMsg } from './functions.js'
import './general.css'

// array with objects containing informations about each component associated web page
// usage: menu items, html titles
const pages = [
  {
    slug: '', // used in URL
    name: 'Home', // used in menu
    menuItem: true, // it is included in menu (as menu item)
    auth: true // page requires login
  },
  {
    slug: 'watchdogs',
    name: 'Watchdogs',
    menuItem: true,
    auth: true
  },
  {
    slug: 'add-watchdog',
    name: 'Add Watchdog',
    menuItem: false,
    auth: true
  },
  {
    slug: 'logs',
    name: 'Logs',
    menuItem: true,
    auth: true
  },
  {
    slug: 'self-logs',
    name: 'Self logs',
    menuItem: true,
    auth: true
  },
  {
    slug: 'settings',
    name: 'Settings',
    menuItem: true,
    auth: true
  },
  {
    slug: '404-no-page',
    name: 'No content here',
    menuItem: false,
    auth: false
  },
  {
    slug: 'login',
    name: 'Login',
    menuItem: true,
    auth: false
  },
  {
    slug: 'logout',
    name: 'Logout',
    menuItem: true,
    auth: true
  },
  {
    slug: 'new',
    name: 'Demo account created',
    menuItem: false,
    auth: true
  }
]

// main react component
// all "page" components are nested inside
function App() {

  // "useLocation" hook
  const location = useLocation()

  // "useState" hook
  const [themeStyle, setThemeStyle] = useState('light') // currently set theme style: light OR dark
  const [themeMode, setThemeMode] = useState('light') // currently selected theme mode: light OR dark OR auto
  const [authenticated, setAuthenticated] = useState(null) // if user is logged in, value is "uuid" of user, otherwise value is set to "null" or "false"
  const [rateLimited, setRateLimited] = useState(null)
  const [serverTime, setServerTime] = useState(null) // informative server time
  const [pw, setPw] = useState(null)

  // "useCookies" hook
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

  // set specific theme mode
  function setThemeByMode(mode) {

    // set theme mode to "auto" by default, if no pre-selected "theme" found in cookies
    if (mode === undefined) {
      mode = 'auto'
    }

    // preparing data for theme cookie
    const cookieOptions = {
      sameSite: true,
      maxAge: 3600 * 24 * 30 * 1000
    }
    const cookieName = 'themeMode'

    // switch between theme modes and set theme styles
    switch (mode) {

      // note:
      // body class name can not be esaily changed using state, because body is not nested inside "App.js" like other components

      case 'light':
        setThemeStyle('light')
        setThemeMode('light')
        setCookie(cookieName, 'light', cookieOptions)
        document.body.className = 'light'
      break

      case 'dark':
        setThemeStyle('dark')
        setThemeMode('dark')
        setCookie(cookieName, 'dark', cookieOptions)
        document.body.className = 'dark'
      break

      case 'auto': // time based theme selection
        const date = new Date()
        let style
        const hourLight = parseInt(process.env.REACT_APP_HOUR_LIGHT, PARSE_INT_BASE) // hour after theme style changes to light (in auto mode)
        const hourDark  = parseInt(process.env.REACT_APP_HOUR_DARK,  PARSE_INT_BASE) // hour after theme style changes to dark (in auto mode)
        if (date.getHours() >= hourLight && date.getHours() < hourDark) {
          // light
          style = 'light'
          document.body.className = 'light'
        } else {
          // dark
          style = 'dark'
          document.body.className = 'dark'
        }
        setThemeStyle(style)
        setThemeMode('auto')
        setCookie(cookieName, 'auto', cookieOptions)
      break

      default:
        setThemeStyle('light')
        setThemeMode('light')
        document.body.className = 'light'
    }

  }

  useEffect(() => {

    // set theme from based on cookie (if exists)
    setThemeByMode(cookies.themeMode)

    // determines if user is logged in
    isAuthenticated()
      .then(response => {

        if (response.authenticated) {

          console.log('Authenticated')
          setAuthenticated(response.uuid)
          setServerTime(response.time)

        } else {

          if (response.rateLimited) {

            setRateLimited(response.message)

          } else {
            const msg = response.message ? response.message : 'Authentication failed'
            console.log(msg)
            setAuthenticated(false)
            setServerTime(false)

          }
        }

      })
      .catch(error => { // user is not logged in

        setAuthenticated(false)
        setServerTime(error.time)

      })

    // set html title
    const rootTitle = 'JASMA Server Monitoring'
    const slug = location.pathname.split('/')[1]
    const page = pages.find(page => page.slug === slug)
    const subTitle = page?.name
    if (slug && slug.length > 0 && subTitle !== undefined) {
      const separator = ' | '
      document.title = `${subTitle}${separator}${rootTitle}`
    } else {
      document.title = rootTitle
    }

  }, [location.pathname])


  // after user creates new account, this will set uuid (to be used in footer) and password (to be used in welocome page)
  function handleRegister(uuid, password, time) {
    setAuthenticated(uuid)
    setServerTime(time)
    setPw(password)
  }

  // after user logs in, this will set uuid (to be used in footer)
  function handleLogin(uuid, time) {
    setAuthenticated(uuid)
    setServerTime(time)
  }

  // after user logs out, this will cancel appropriate states
  function handleLogout() {
    setAuthenticated(false)
    setServerTime(false)
  }

  // displays loading indicator while fetching data
  if (rateLimited) {
    return (
      <div className="centerDiv">
        { generateStatusMsg(rateLimited, 'bad') }
      </div>
    )
  }

  // displays loading indicator while fetching data
  if (authenticated === null) {
    return (
      <div className="centerDiv">
        <LoadingIndicator />
      </div>
    )
  }

  // returns appropriate web content, with components and routes
  // part of the content is conditionally generated, based on user login status
  return (
      <div className="App" id={themeStyle}> {/* id is for switching between dark/light modes */}

          <Header themeProps={{ themeStyle, themeMode, themeToggle }} authenticated={authenticated} />
          <Routes>
            {authenticated ? (
              // if user is logged in
              <>
                <Route index element={<Home />} />
                <Route path="/watchdogs">
                  <Route index element={<Watchdogs />} />
                  <Route path=":watchdogId" element={<Edit />} />
                </Route>
                <Route path="/add-watchdog" element={<Add />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/self-logs" element={<SelfLogs />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/new" element={<New pw={pw} />} />
                <Route path="/logout" element={<Logout onLogout={handleLogout} />} />
                <Route path="*" element={<NoPage />} />
              </>
            ) : (
              // if user is NOT logged in
              <>
                <Route path="*" element={<Login onRegister={handleRegister} onLogin={handleLogin} authenticated={authenticated} />} />
              </>
            )}
          </Routes>
          <Footer authenticated={authenticated} serverTime={serverTime} />

      </div>
  )

}

export { pages }
export default App
