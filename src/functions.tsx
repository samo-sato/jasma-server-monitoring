import { urlBase, snoozePath, validateEnv } from './utils.js';

// Import type for `useRef` React hook
import type { RefObject } from 'react';

// Validating environment variables
const REACT_APP_SECURE          = validateEnv(process.env.REACT_APP_SECURE, false);
const REACT_APP_DOMAIN          = validateEnv(process.env.REACT_APP_DOMAIN, true);
const REACT_APP_BASE_PATH       = validateEnv(process.env.REACT_APP_BASE_PATH, false);
const REACT_APP_SUBDOMAIN       = validateEnv(process.env.REACT_APP_SUBDOMAIN, false);
const REACT_APP_PUBLIC_PORT_API = validateEnv(process.env.REACT_APP_PUBLIC_PORT_API, false);

let urlBaseEnvs = {
  secure: REACT_APP_SECURE,
  domain: REACT_APP_DOMAIN,
  basePath: REACT_APP_BASE_PATH,
  subdomain: REACT_APP_SUBDOMAIN,
  port: REACT_APP_PUBLIC_PORT_API
}

// Enable or disables html element (usually <button>)
// Button is referenced using `useRef` React hook
export const elementToggle = {

  // Disable given html element by ref
  disable: function (ref: RefObject<any>): void {
    ref.current.disabled = true;
  },

  // Enable given html element by ref
  enable: function (ref: RefObject<any>): void {
    ref.current.disabled = false;
  },

  // Disable given html element by ref
  hide: function (ref: RefObject<any>): void {
    ref.current.hidden = true;
  },

  // Enable given html element by ref
  show: function (ref: RefObject<any>): void {
    ref.current.hidden = false;
  }

}

/**
 * Generate status messages for the user in React app
 * @param messages String or arrays of strings
 * @param clName CSS class used to style given message(s)
 * @returns Messages as JSX
 */
export function generateStatusMsg(messages: string | Array<string> | Error, clName: string): any {

  let msgs;
  if (typeof messages === 'string') { // Likely single message
    msgs = [messages]
  } else if (Array.isArray(messages)) { // Likely array of messages
    msgs = messages
  } else if (messages instanceof Error) { // Likely error object
    msgs = [messages.message || 'Unknown error']
  } else if (typeof messages === 'object') { // Likely JSX component with message
    return messages
  } else {
    msgs = ['Error']
  }

  let display = msgs.length === 1 ? 'inline' : 'block'
  let result: Array<React.JSX.Element> = []
  msgs.forEach((msg, index) => {
    result.push(<div style={{display:display}} key={index} className={clName}>{msg}</div>)
  })

  return (<>{result}</>)
}

// Returns JSX element with help icon
// Element shows text with help on mouse hover
export function generateHelp(text: string) {
  return <span className="help" title={text}>( ? )</span>
}

// Returns snooze url endpoint for passive watchdogs based on watchdog ID (wid)
export function generateSnoozeUrl(wid: string) {
  return `${urlBase(urlBaseEnvs, true)}/${snoozePath}?wid=${wid}`
}

/**
 * Format timestamp in milliseconds to local timezone date and time
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date and time string in format: YYYY-MM-DD HH:mm
 * @example
 * // If timestamp is 1708952340000 (2024-02-26 14:19:00 UTC)
 * // and user is in New York (UTC-5)
 * formatLocalDateTime(1708952340000) // returns "2024-02-26 09:19"
 */
export function formatLocalDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  
  // Get local date components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Generate note for logs table
 * @returns Note as JSX
 */
export function generateTableNote(): JSX.Element {
  return (
    <>
      <p>Newest logs are shown first</p>
      <p>Browser based time is used</p>
    </>
  )
}