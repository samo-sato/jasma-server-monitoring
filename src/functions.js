import { constants } from './constants'

// API server endpoint root
const backendRoot = window.location.protocol + '//' + window.location.hostname + ':' + constants.backendPort

// file with general frontend functions

// methods for making given html button disabled or enabled
// button is referenced by react ref ("useRef" hook)
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

// generate JSX textual message(s) for the user
// used with react state, in order to generate error, or other status messages for the user
  // arguments:
  // "messages" => string or arrays of strings
  // "className" => css class used to style given message(s)
export function generateStatusMsg (messages, className) {

  const msgs = typeof messages === 'string' ? [messages] : (
    typeof messages === 'object' ? (
      Array.isArray(messages) ? messages : []
    ) : []
  )

  const cl = typeof className === 'string' ? className : null

  let result = []
  msgs.forEach((msg, index) => {
    result.push(<p key={index} className={cl}>{msg}</p>)
  })

  return (<>{result}</>)
}


// returns JSX element with help icon
// element shows text with help on mouse hover
export function generateHelp(text) {
  return <span className="help" title={text}>(&nbsp;?&nbsp;)</span>
}


// returns snooze url endpoint for passive watchdogs based in their "privateId"
export function generateSnoozeUrl(privateId) {
  return `${backendRoot}/${constants.urlPassiveMode}/${privateId}`
}
