import { useState, useEffect } from 'react';
import { useCookies } from 'react-cookie';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Login from './components/content/Login/Login.jsx';
import Logout from './components/content/Logout/Logout.jsx';
import Home from './components/content/Home/Home.jsx';
import Watchdogs from './components/content/Watchdogs/Watchdogs.jsx';
import Edit from './components/content/Watchdogs/Edit.jsx';
import Add from './components/content/Watchdogs/Add.jsx';
import Logs from './components/content/Logs/Logs.jsx';
import SelfLogs from './components/content/SelfLogs/SelfLogs.jsx';
import Settings from './components/content/Settings/Settings.jsx';
import About from './components/content/About/About.jsx';
import New from './components/content/New/New.jsx';
import NotFound from './components/content/NotFound/NotFound.jsx';
import LoadingIndicator from './components/LoadingIndicator.jsx';
import { toInt, validateEnv, refreshDelayLong } from './utils.js';
import { isAuthenticated } from './fetchAPI.js';
import './general.css';

// Validating environment variables
const REACT_APP_SECURE     = validateEnv(process.env.REACT_APP_SECURE, false);
const REACT_APP_HOUR_LIGHT = validateEnv(process.env.REACT_APP_HOUR_LIGHT, true);
const REACT_APP_HOUR_DARK  = validateEnv(process.env.REACT_APP_HOUR_DARK, true);

// Dark / Light / Auto mode related type
enum Mode {
  Light = 'light',
  Dark = 'dark',
  Auto = 'auto'
}

// Array with objects containing informations about each component associated web page
// Usage: menu items, html titles
const pages = [
  {
    slug: '', // Used in URL
    name: 'Home', // Used in menu
    menuItem: true, // It is included in menu (as menu item)
    auth: true // Page requires login
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
    slug: 'about',
    name: 'About',
    menuItem: true,
    auth: null
  },
  {
    slug: 'not-found',
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

// Main react component
// All `page` components are nested inside
function App() {

  // `useLocation` hook
  const location = useLocation();

  // `useState` hook
  const [themeStyle, setThemeStyle] = useState('light'); // Currently set theme style: light OR dark
  const [themeMode, setThemeMode] = useState('light'); // Currently selected theme mode: light OR dark OR auto
  const [authenticated, setAuthenticated] = useState<boolean | string | null>(null); // If user is logged in, value is `uuid` of user, otherwise value is set to `null` or `false`
  const [serverTime, setServerTime] = useState<boolean | string | null>(null); // Informative server time
  const [pw, setPw] = useState<string | null>(null);

  // `useCookies` hook
  const [cookies, setCookie] = useCookies(['themeSettings']); // Cookies used to save selected theme mode

  // Toggling between theme styles based on selected `themeMode` state variable
  function themeToggle() {

    switch (themeMode) {

      case 'light': // Current mode is `light` and switching to `dark`
        setThemeByMode(Mode.Dark);
      break;

      case 'dark': // Current mode is `dark` and switching to `auto`
        setThemeByMode(Mode.Auto);
      break;

      case 'auto': // Current mode is `auto` and switching to `light`
        setThemeByMode(Mode.Light);
      break;

      default:
        setThemeByMode(Mode.Light);
    }

  }

  // Set specific theme mode
  function setThemeByMode(mode: Mode | undefined) {

    // Set theme mode to `auto` by default, if no pre-selected `theme` found in cookies
    if (mode === undefined) {
      mode = Mode.Auto;
    }

    // Preparing data for theme cookie
    const secure = REACT_APP_SECURE.toLowerCase() === 'true' ? true : false;
    const cookieOptions = {
      secure: secure,
      sameSite: 'strict' as 'strict',
      maxAge: 3600 * 24 * 30 * 1000
    }
    const cookieName = 'themeSettings';

    // Switch between theme modes and set theme styles
    switch (mode) {

      // Note:
      // Body class name can not be esaily changed using state, because body is not nested inside `App.js` like other components

      case Mode.Light:
        setThemeStyle(Mode.Light);
        setThemeMode(Mode.Light);
        setCookie(cookieName, Mode.Light, cookieOptions);
        document.body.className = Mode.Light;
      break;

      case Mode.Dark:
        setThemeStyle(Mode.Dark);
        setThemeMode(Mode.Dark);
        setCookie(cookieName, Mode.Dark, cookieOptions);
        document.body.className = Mode.Dark;
      break;

      case Mode.Auto: // Time based theme selection
        const date = new Date();
        let style;
        const hourLight = toInt(REACT_APP_HOUR_LIGHT); // Hour after theme style changes to light (in auto mode)
        const hourDark  = toInt(REACT_APP_HOUR_DARK); // Hour after theme style changes to dark (in auto mode)
        if (date.getHours() >= hourLight && date.getHours() < hourDark) {
          // Light
          style = Mode.Light;
          document.body.className = Mode.Light;
        } else {
          // Dark
          style = Mode.Dark;
          document.body.className = Mode.Dark;
        }
        setThemeStyle(style);
        setThemeMode(Mode.Auto);
        setCookie(cookieName, Mode.Auto, cookieOptions);
      break

      default:
        setThemeStyle(Mode.Light);
        setThemeMode(Mode.Light);
        document.body.className = Mode.Light;
    }

  }

  const fetchAuthStatus = () => {
    isAuthenticated()
      .then(response => {
        if (response.authenticated) {
          setAuthenticated(response.uuid);
          setServerTime(response.time);
        } else {
          const msg = response.message ? response.message : 'Not authorized';
          console.log(msg);
          setAuthenticated(false);
          setServerTime(false);
        }
      })
      .catch(error => { // User is not logged in
        setAuthenticated(false);
        setServerTime(error.time);
      })
  }

  useEffect(() => {

    fetchAuthStatus();

    let intervalId: NodeJS.Timeout;
    if (authenticated) {

      // Using setInterval to achieve autorefresh of fetched data
      intervalId = setInterval(() => {
        fetchAuthStatus();
      }, refreshDelayLong)

    }

    // Set theme from based on cookie (if exists)
    setThemeByMode(cookies.themeSettings);

    // Set html title
    const rootTitle = 'JASMA Server Monitoring';
    const slug = location.pathname.split('/')[1];
    const page = pages.find(page => page.slug === slug);
    const subTitle = page?.name;
    if (slug && slug.length > 0 && subTitle !== undefined) {
      const separator = ' | ';
      document.title = `${subTitle}${separator}${rootTitle}`;
    } else {
      document.title = rootTitle;
    }

    return () => {
      clearInterval(intervalId);
    }

  }, [location.pathname])


  // After user creates new account, this will set uuid (to be used in footer) and password (to be used in welocome page)
  function handleRegister(uuid: string, password: string, time: string) {
    setAuthenticated(uuid);
    setServerTime(time);
    setPw(password);
  }

  // After user logs in, this will set uuid (to be used in footer)
  function handleLogin(uuid: string, time: string) {
    setAuthenticated(uuid);
    setServerTime(time);
  }

  // After user logs out, this will cancel appropriate states
  function handleLogout() {
    setAuthenticated(false);
    setServerTime(false);
  }

  // Displays loading indicator while fetching data
  if (authenticated === null) {
    return (
      <div className="centerDiv">
        <LoadingIndicator />
      </div>
    )
  }

  // Returns appropriate web content, with components and routes
  // Part of the content is conditionally generated, based on user login status
  return (
      <div className="App" id={themeStyle}> {/* Id is for switching between dark / light modes */}

          <Header themeProps={{ themeStyle, themeMode, themeToggle }} authenticated={authenticated} />
          <Routes>
            {authenticated ? (
              // If user is logged in
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
                <Route path="/about" element={<About />} />
                <Route path="/new" element={<New pw={pw} />} />
                <Route path="/logout" element={<Logout onLogout={handleLogout} />} />
                <Route path="*" element={<NotFound />} />
              </>
            ) : (
              // If user is NOT logged in
              <>
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login onRegister={handleRegister} onLogin={handleLogin} authenticated={authenticated} />} />
                <Route path="*" element={<Login onRegister={handleRegister} onLogin={handleLogin} authenticated={authenticated} />} />
              </>
            )}
          </Routes>
          <Footer authenticated={authenticated} serverTime={serverTime} />

      </div>
  )

}

export { pages };
export default App;