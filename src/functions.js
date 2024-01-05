import { urlBase, snoozePath } from './globals.js'

// enables or disables html element (usually <button>)
// button is referenced using "useRef" React hook
export const elementToggle = {

  // disables given html element by ref
  disable: function (ref) {
    ref.current.disabled = true
  },

  // enables given html element by ref
  enable: function (ref) {
    ref.current.disabled = false
  },

  // disables given html element by ref
  hide: function (ref) {
    ref.current.hidden = true
  },

  // enables given html element by ref
  show: function (ref) {
    ref.current.hidden = false
  }

}

// returns JSX formated message(s)
// used with react state, in order to generate status messages for the user
  // arguments:
  // "messages" => string or arrays of strings
  // "className" => css class used to style given message(s)
export function generateStatusMsg(messages, className) {

  let msgs
  if (typeof messages === 'string') { // likely single message
    msgs = [messages]
  } else if (Array.isArray(messages)) { // likely array of messages
    msgs = messages
  } else if (messages instanceof Error) { // likely error object
    msgs = [messages.message || 'Unknown error']
  } else if (typeof messages === 'object') { // likely JSX component with message
    return messages
  } else {
    msgs = ['Error']
  }

  const cl = typeof className === 'string' ? className : null

  let display = msgs.length === 1 ? 'inline' : 'block'
  let result = []
  msgs.forEach((msg, index) => {
    result.push(<div style={{display:display}} key={index} className={cl}>{msg}</div>)
  })

  return (<>{result}</>)
}

// returns JSX element with help icon
// element shows text with help on mouse hover
export function generateHelp(text) {
  return <span className="help" title={text}>( ? )</span>
}

// returns snooze url endpoint for passive watchdogs based on watchdog ID (wid)
export function generateSnoozeUrl(wid) {
  return `${urlBase(process.env.REACT_APP_PUBLIC_PORT_API, true)}/${snoozePath}?wid=${wid}`
}
