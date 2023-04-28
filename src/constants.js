// public constants

const constants = {
  minWatchdogNameLength: 1, // minimum watchdog name length
  maxWatchdogNameLength: 20, // maximum watchdog name length
  minWatchdogUrlLength: 7,  // minimum watchdog url length
  maxWatchdogUrlLength: 2000,  // maximum watchdog url length
  backendPort: 3001,
  urlAuthOnly: 'api', // url backend path for logged in users only
  urlNonAuth: 'login', // url backend path for login (for logged out users only)
  urlPassiveMode: 'snooze', // url backend path for making "passive" logs from remote servers (from monitored services in passive mode)
  minScanningInterval: 10*1000, // (ms) minimum scanning interval
  maxScanningInterval: 12*60*60*1000, // (ms) maximum scanning interval
  minTokenExpiration: 60, // (s) minimum time user may stay logged in without automatic logout
  maxTokenExpiration: 7*24*60*60, // (s) maximum time user may stay logged in without automatic logout
  repeatDelay: 10*1000 // (ms) delay between each run of "scanning" functions (it is used in "setInterval" method)
}

module.exports = { constants }
