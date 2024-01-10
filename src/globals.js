// // import React environment variables from ".env" file
// import dotenv from 'dotenv'
// dotenv.config()

// generic error message related to server issues
export const serErr = 'Server error, please try later'

// used in parseInt functions, numeral system
export const PARSE_INT_BASE = 10

// variables used in different url generating functionality
export const widLength = 30
export const apiPathName = 'api'
export const restrictedPath = 'private'
export const snoozePath = 'snooze'

// autorefresh timing vairables
export const refreshDelayShort = 1000 // milliseconds - used in setInterval
export const refreshDelayLong = 15000 // milliseconds - used in setInterval
export const monitoringIntervalNote = `Monitoring is executed every ${msToWords(parseInt(process.env.REACT_APP_REPEAT_DELAY, PARSE_INT_BASE))}`
export const autorefreshNote = 'Data on this page are updated automatically'

// takes number of milliseconds and returns aprox. string description of that time length
// eg. 5421 => "5 seconds"
export function msToWords(ms) {

  let unit
  let divider

  if (ms >= 0           && ms < 59000      ) { unit = 'second' ; divider = 1000*1} else if
     (ms >= 59000       && ms < 3540000    ) { unit = 'minute' ; divider = 1000*60} else if
     (ms >= 3540000     && ms < 82800000   ) { unit = 'hour'   ; divider = 1000*60*60} else if
     (ms >= 82800000    && ms < Infinity   ) { unit = 'day'    ; divider = 1000*60*60*24}
  else { unit = 'N/A' }

  const number = Math.round(ms / divider)
  const s = number === 0 || number > 1 ? 's' : ''
  return ` ${number} ${unit}${s}`

}

// generates random string of pre-defined characters
export function generateRandomString(length) {

  // characters used to generate random strings
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  let result = ''

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    result += characters.charAt(randomIndex)
  }

  return result
}

// returns URL base with optional port number, base path and API path sourced from environment variables
// port number, base path and API path must not be an empty string in order to be included in returned url
// examples of returned value:
// "https://www.example.com"               in case REACT_APP_DOMAIN="example.com"; envPort="";     REACT_APP_BASE_PATH="";     REACT_APP_API_PATH="";    api=false
// "https://www.example.com:3001/shop/api" in case REACT_APP_DOMAIN="example.com"; envPort="3001"; REACT_APP_BASE_PATH="shop"; REACT_APP_API_PATH="api"; api=true
export function urlBase(envPort, api) {

  // make "api" argument mandatory
  if (api !== true && api!== false) { throw new Error('Invalid function parameter') }

  const protocol = process.env.REACT_APP_SECURE.toLowerCase() === 'true' ? 'https://' : 'http://' // protocol used in url (http or https)
  const subDomain = process.env.REACT_APP_SUBDOMAIN ? `${process.env.REACT_APP_SUBDOMAIN}.` : '' // if set, include subdomain in url, example for "www": "https://www.example.org"
  const domain = process.env.REACT_APP_DOMAIN
  if (!domain || domain === '') {
    const msg = 'Invalid domain url, check environment variables'
    throw new Error(msg)
  }

  // add semicolon, in case port is not empty string
  const port = envPort && `:${envPort}`

  // add forward slash, in case base path is not empty string
  const basePath = process.env.REACT_APP_BASE_PATH && `/${process.env.REACT_APP_BASE_PATH}`

  // add api path, in case api parameter is set to true
  let apiPath = api === true ? apiPathName : ''

  // add forward slash to apiPath, in case apiPath is not empty string
  apiPath = apiPath && `/${apiPath}`
  return `${protocol}${subDomain}${domain}${port}${basePath}${apiPath}`

}
