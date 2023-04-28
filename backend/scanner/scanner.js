// this script invokes functions in regular time intervals
// purpose of these functions is mostly status checking ("service monitoring") and status logging of given services and logging so called "self logs", which are indications that this app itself is running

const path = require('path')

const { constants } = require(path.resolve(__dirname, '..', '..', 'src', 'constants'))

// main "server monitoring" and logging functionality
const { repeatThis } = require(path.resolve(__dirname, 'functions'))

// time interval (ms) for invoking main functions
let delay = constants.repeatDelay

// main code is located on "repeatThis" callback
// "repeatThis" conotains main "server monitoring" and logging functionalities
// callback is used in order to first execute "repeatThis" immediately when "modifySetInterval" is called and not just after specified delay
function modifySetInterval(callback, delay) {
  callback()
  return setInterval(callback, delay)
}

// invoking main code
modifySetInterval(repeatThis, delay)
