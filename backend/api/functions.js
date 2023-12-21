// import shared environment variables from ".env" file
import dotenv from 'dotenv'
dotenv.config()

// logger
import { logger } from '../functions.js'

// Json Web Token
import pkg from 'jsonwebtoken'
const { sign: jwtSign } = pkg

import { PARSE_INT_BASE, widLength } from '../../src/globals.js'
import { saveToken } from './handleDB.js'
import { sendMail } from '../functions.js'

// 1) logs in User with given uuid
// 2) generates token (with given expiration time)
// 3) saves token to DB
export function loginUser (uuid) {

  return new Promise( async (resolve, reject) => {

    try {

      const signedToken = jwtSign({ user: uuid }, process.env.JASMA_JWT_SECRET, { expiresIn: process.env.JASMA_TOKEN_EXPIRATION }) // generate auth token using JWT module
      await saveToken(uuid, signedToken) // save auth token to DB
      resolve({
        code: 201,
        data: signedToken
      })

    } catch (error) {
      const msg = `User [${uuid}] login has failed`
      logger.error(`${msg} [${error.stack || error.data || error}]`)
      reject({
        code: 500,
        data: "Login error"
      })
    }

  })

}

// methods for validating different form inputs
// returns array
// returned array is empty, if data evaluated as valid
// returned array contains error messages (strings), if data invalid
export const validate = {

  // validates "Watchdog" data
  watchdog: function (data) {

    // input data preparation
    let adding = data.adding // validating Watchdog that is being added (adding = true) or edited (adding = false)
    let name = data.name
    let url = data.url
    let wid = data.wid || null // Watchdog ID => if adding passive mode watchdog with pre-generated Watchdog ID
    let enabled = data.enabled
    let email_notif = data.email_notif
    let passive = data.passive
    let threshold = data.threshold
    let errors = []

    // input type validation
    if (
      typeof name !== 'string' ||
      typeof url !== 'string' ||
      (enabled !== 0 && enabled !== 1) ||
      (email_notif !== 0 && email_notif !== 1) ||
      (adding && passive !== 0 && passive !== 1)
    ) {
      return ['Invalid input type']
    }

    // if adding "passive mode" Watchdog, check wid length (if this not valid, user probably tried to manipulate input data in non-standard way)
    if (wid && passive === 1 && wid.length !== widLength) { return ['Invalid Watchdog ID length'] }

    // input length validation
    const minWNL = parseInt(process.env.REACT_APP_MIN_WD_NAME_LENGTH, PARSE_INT_BASE)
    const maxWNL = parseInt(process.env.REACT_APP_MAX_WD_NAME_LENGTH, PARSE_INT_BASE)
    const minWUL = parseInt(process.env.REACT_APP_MIN_WD_URL_LENGTH, PARSE_INT_BASE)
    const maxWUL = parseInt(process.env.REACT_APP_MAX_WD_URL_LENGTH, PARSE_INT_BASE)
    const minThr = parseInt(process.env.REACT_APP_MIN_THRESHOLD, PARSE_INT_BASE)
    const maxThr = parseInt(process.env.REACT_APP_MAX_THRESHOLD, PARSE_INT_BASE)
    if (name.length < minWNL) { errors.push(`Minimum watchdog name length is ${minWNL}`) }
    if (name.length > maxWNL) { errors.push(`Maximum watchdog name length is ${maxWNL}`) }
    if (name.length < minThr) { errors.push(`Minimum notifying threshold is ${minWNL} consecutive "not ok" states`) }
    if (name.length > maxThr) { errors.push(`Maximum notifying threshold is ${maxWNL} consecutive "not ok" states`) }

    // validate Watchdog URL, only if validating Watchdog in active mode
    if (passive === 0) {

      try {
        const parsedURL = new URL(url)
        if (parsedURL.protocol !== 'http:' && parsedURL.protocol !== 'https:') { throw new Error('Only http or https protocols are allowed') }
      } catch (error) {
        errors.push('URL string is not valid')
      }

      if (url.length < minWUL) { errors.push(`Minimum watchdog url length is ${minWUL}`) }
      if (url.length > maxWUL) { errors.push(`Maximum watchdog url length is ${maxWUL}`) }

    }

    return errors
  },

  // validate user's email
  // empty string will be accepted, as it is considered as user's desire not to provide email
  email: function (email) {

    let errors = []

    if (typeof email !== 'string') { return ['Email must be string'] }

    if (email === '') { return [] }

    const validateEmail = (email) => {
      return String(email)
        .toLowerCase()
        .match(
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        )
    }

    if (!validateEmail(email)) { errors.push('Invalid email address') }

    return errors

  },

  // validate "req.query" object provided to API endpoint for searching logs using constraints defined in query
  logFilter: function (query) {

    let errors = []

    // checking for required date(s) variable
    if (!query.datefrom) { errors.push('Missing "from" date') }

    // checking for required date(s) variable
    if (!query.dateto) { errors.push('Missing "to" date') }

    // checking for required query variables
    if (!query.status0 || !query.status1) { errors.push('Missing status variable(s)') }

    // type validation
    let regex = /^\d{4}-\d{2}-\d{2}$/ // regex for date validation in format "YYYY-MM-DD"
    if (
      typeof query.datefrom !== 'string' ||
      typeof query.dateto !== 'string' ||
      !regex.test(query.datefrom) ||
      !regex.test(query.dateto) ||
      typeof query.status0 !== 'string' ||
      typeof query.status1 !== 'string' ||
      typeof query.watchdogs !== 'string'
    ) {
      errors.push('Invalid type')
    }

    // at least one Watchdog should be selected
    if (query.watchdogs.length === 0) { errors.push('At least one Watchdog should be selected') }

    // at least one status type should be selected
    if (query.status0 === '0' && query.status1 === '0') { errors.push('At least one status type should be selected') }



    // date conversion: from "YYYY-MM-DD" format to unix epoch time integer (ms)
    const newDateFrom = new Date(query.datefrom)
    const newDateTo = new Date(query.dateto)
    const dateFrom = newDateFrom.getTime()
    const dateTo = newDateTo.getTime()

    // date comparison validation ("date from" must be less or equal than "date to")
    if (dateFrom > newDateTo) { errors.push('"From" date must be smaller or equal than "To" date') }

    return errors
  }

}
