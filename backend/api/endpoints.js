// import shared environment variables from ".env" file
import dotenv from 'dotenv'
dotenv.config()

import { logger, generateUnsubscribeKeyUrl, generateActivationKeyUrl, sendMail } from '../functions.js'
import { activationEndpoint, activationParam, unsubscribeEndpoint, unsubscribeParam } from '../constants.js'

// expressjs
import express from 'express'
const app = express()

// custom functions
import { PARSE_INT_BASE, snoozePath, apiPathName, restrictedPath, generateRandomString } from '../../src/globals.js'
import { hash, saltedPwHash, getCurrentDateTimeUTC } from '../functions.js'
import { isNotUnsubscribed } from '../handleDB.js'
import { validate, loginUser } from './functions.js'
import * as handleDB from './handleDB.js'

// express middleware (request rate limiting)
import { rateLimit }from 'express-rate-limit'

// express middleware (cors)
import cors from 'cors'
app.use(cors({
    origin: true,
    credentials: true
}))

// express middleware (cookie parser)
import cookieParser from 'cookie-parser'
app.use(cookieParser())

// Json Web Token
import pkg from 'jsonwebtoken'
const { verify: jwtVerify } = pkg

const serErr = 'Server error' // generic error message

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

// rate limiter applied on all endpoints
const rootLimiter = rateLimit({
  windowMs: 60 * 1000, // milli-seconds
  max: 100, // limit each IP to max requests per windowMs
  handler: (req, res, next, options) => {
    if (req.rateLimit.used === req.rateLimit.limit + 1) {
      logger.info(`Rate limit reached. IP address [${req.ip}]`)
      res.status(429).send({
        rateLimited: true,
        message: 'Too Many Requests. Please try again later.'
      })
    }
  }
})
app.use('/', rootLimiter)

// adds delay for testing - remove before deployment
const delayment = (req, res, next) => {
//  setTimeout(() => {
    next()
//  }, 1000)
}
app.use('/', delayment)


// if using base path, all traffic should go via base path
// eg. https://www.example.com/basepath
const baseRouter = express.Router()

// constructing beginning of all endpoint paths
const basePath = process.env.REACT_APP_BASE_PATH
const apiPath = basePath ? (apiPathName ? `/${apiPathName}` : '') : apiPathName
let rootPath = `/${basePath}${apiPath}`

app.use(rootPath , baseRouter)

// using "auth" router for endpoints with mandatory authentication
const authRouter = express.Router()
baseRouter.use(`/${restrictedPath}`, authenticate, authRouter)

// this API endpoint handles requests from services in "passive" mode
// each hit of following endpoint with correct parameter will create temporary log with timestamp and id (stored in wide-scoped array variable "passiveLogs")
let passiveLogs = [] // in this variable will be stored temporary logs, it will be exported and use in another script for further processing
baseRouter.get(`/${snoozePath}`, (req, res) => {

  const watchdogID = req.query.wid // extracting Watchdog ID from the request (it identifies related Watchdog/service)

  // update the timestamp of given id in array with temporary logs if needed
  let logUpdated = false
  passiveLogs.forEach((value, index) => {
    if (value.watchdogID === watchdogID) {
      passiveLogs[index].timestamp = Date.now() // update the timestamp
      logUpdated = true
    }
  })

  // if the log with watchdog ID from request does not exist yet in our log array, we need to add it there
  if (!logUpdated) {
    passiveLogs.push({
      watchdogID: watchdogID,
      timestamp: Date.now()
    })
  }

  // remove old logs from wide-scope variable to save memory
  passiveLogs = passiveLogs.filter(log => log.timestamp > Date.now() - parseInt(process.env.REACT_APP_REPEAT_DELAY, PARSE_INT_BASE) * 2)
  const msg = `Endpoint [${req.url}] was hit from IP [${req.ip}]`
  logger.info(msg)
  res.status(200).send('ok')

})

// endpoint for creating new account and automatic login when account created successfully
baseRouter.get('/register', async (req, res) => {

  // check user's answer to antibot question
  const answer = req.query.answer ? req.query.answer : undefined
  if (!answer || answer !== '3' && answer.toLowerCase() !== 'three') {
    const msg = `Invalid answer [${answer}] to antibot question`
    logger.info(msg)
    res.status(400).send({message: 'Wrong answer, please try again'})
  } else {
    try {
      const user = await handleDB.addUser()
      const loggedUser = await loginUser(user.data.uuid)
      const token = loggedUser.data
      saveTokenToCookie(token, res)
      res.status(201).send({
        message: 'Account created, user logged in',
        password: user.data.password,
        uuid: user.data.uuid,
        time: getCurrentDateTimeUTC()
      })
    } catch (error) {
      const msg = `Create account has failed`
      logger.error(`${msg} [${error.stack || error.data || error}]`)
      res.status(500).send({message: msg})
    }

  }

})

// confirm User's email address (after user clicks on confirmation link in email message)
baseRouter.get(`/${activationEndpoint}`, async (req, res) => {

  const key = req.query[activationParam]

  try {

    const result = await handleDB.activateEmail(key)
    res.status(result.code).send(result.data)

  } catch (error) {

    const code = error.code ? error.code : 500
    const data = error.data ? error.data : serErr
    const msg = `Email activation has failed [${data}] [${error.stack || error.data || error}]`
    logger.error(msg)
    res.status(code).send(data)

  }

})

// unsubscribe email address (after user clicks on unsubscribe hyperlink in email message)
baseRouter.get(`/${unsubscribeEndpoint}`, async (req, res) => {

  const key = req.query[unsubscribeParam]

  try {
    const result = await handleDB.unsubscribeEmail(key)
    const msg = `Email address associated with unsubscribe key [${key}] has been successfully unsubscribed`
    logger.info(msg)
    res.status(result.code).send(result.data)
  } catch (error) {
    const code = error.code ? error.code : 500
    const data = error.data ? error.data : serErr
    const msg = `Email address associated with unsubscribe key [${key}] failed to unsubscribe`
    logger.error(`${msg} [${error.stack || error}]`)
    res.status(code).send(data)
  }

})

// endpoint for users without authentication (login page)
baseRouter.post('/login', async (req, res) => {

  let uuid
  try {

    // check if user with given password exists and get user's uuid
    uuid = await handleDB.getUUIDbyPassword(req.body.password)

    // fetch User's settings
    const settings = await handleDB.getSettings(uuid)

    // login the User and save login token to DB and http cookie
    const loggedUser = await loginUser(uuid)
    const token = loggedUser.data

    // save token to http cookie
    saveTokenToCookie(token, res)

    // user is logged in

    // log information about successful login
    logger.info(`User [${uuid}] logged in`)

    // send back success response with uuid of User and current server time
    res.status(200).send({
      uuid: uuid,
      message: 'Login successful',
      time: getCurrentDateTimeUTC()
    })

  } catch (error) {
    const code = error.code ? error.code : 500
    const data = error.data ? error.data : serErr
    logger.error(`User [${uuid}] failed to log in [${error.stack || error.data || error}]`)
    res.status(code).send({message: data})

  }

})

// endpoint for user logout
authRouter.post('/logout', async (req, res) => {

  try {

     // loading token from cookie
    const token = req.cookies.token

    // invalidate User token
    const loggedOut = await handleDB.logoutToken(token)

    // prepare token cookie to be removed
    const cookieSettings = {
      httpOnly: true,
      sameSite: 'None',
      secure: true,
      expires: new Date(0)
    }

    // remove token cookie and send success response
    res.cookie('token', '', cookieSettings)
    res.status(200).send({data: 'ok'})

  } catch (error) {

    logger.error(`Logout failed. Token [${token}] [${error.stack || error}]`)
    res.status(500).send({data: 'Logout failed'})

  }

})

// id param validation middleware
authRouter.param('id', (req, res, next, idParam) => {
  if (typeof idParam === 'string' && idParam !== '') {
    req.id = idParam
    next()
  } else {
    const msg = 'ID validation failed'
    logger.error(`${msg}. Param: [${idParam}]`)
    next(msg)
  }
})

authRouter.get('/authenticate', (req, res) => {
  const data = {
    authenticated: true,
    uuid: req.uuid,
    time: getCurrentDateTimeUTC()
  }
  res.status(200).send(data)
})

// get all items from "Watchdog" table
authRouter.get('/watchdogs', async (req, res) => {

    try {
      const result = await handleDB.getWatchdogs(req.uuid)
      res.status(result.code).send(result.data)
    } catch (error) {
      logger.error(`GET failed to get Watchdogs [${error.data || error.stack || error}]`)
      res.status(error.code).send(error.data)
    }

})

// get signle item from "Watchdog" table
authRouter.get('/watchdogs/:id', async (req, res) => {

    try {
      const result = await handleDB.getWatchdog(req.id, req.uuid)
      res.status(result.code).send(result.data)
    } catch (error) {
      logger.error(`GET failed to get Watchdog with ID [${req.id}] [${error.data || error.stack || error}]`)
      res.status(error.code).send(error.data)
    }

})

// updating item inside "Watchdog" table
authRouter.put('/watchdogs/:id', async (req, res) => {

    const data = req.body // input data about new item
    const errors = validate.watchdog(data) // input data validation

    if (errors.length === 0) { // if validation ok

      // update Watchdog
      handleDB.updateWatchdog(req.id, data, req.uuid)
        .then(response => {
          res.status(response.code).send({data: response.data})
        })
        .catch(error => {
          const msg = `PUT failed to update Watchdog ID [${req.id}] [${error.data || error.stack || error}]`
          logger.error(msg)
          res.status(error.code).send({data: error.data})
        })

    } else { // if validation not ok, return error messages related to failed validation
      res.status(400).send({data: errors})
    }

})

// adding item into "Watchdog" table
authRouter.post('/watchdogs', async (req, res) => {

  // user input validation
  const data = req.body
  const uuid = req.uuid
  const valErrors = validate.watchdog(data)

  if (valErrors.length === 0) {

    try {

      // duplicity check
      await handleDB.checkWatchdogDuplicity(data.name, data.url, uuid)

      // max enabled Watchdogs check
      // non-master User is allowed to have max specific amount of enabled Watchdogs (limit defined in envrionment variables)
      if (data.enabled === 1) { await handleDB.checkMaxWatchdogs(uuid) }

      // adding new Watchdog
      const watchdogAdded = await handleDB.addWatchdog(data, uuid)

      // send success response
      res.status(watchdogAdded.code).send({data: watchdogAdded.data})

    } catch (error) {
      const msg = `POST failed to add new Watchdog [${error.data || error.stack || error}]`
      logger.error(msg)
      const code = error.code ? error.code : 500
      const data = error.data ? error.data : serErr
      res.status(code).send({data: data})
    }

  } else {
    res.status(400).send({data: valErrors})
  }

})

// deleting item inside "Watchdog" table
authRouter.delete('/watchdogs/:id', async (req, res) => {
  try {
    const result = await handleDB.deleteWatchdog(req.id, req.uuid)
    res.status(result.code).end() // DELETE response can not contain body
  } catch (error) {
    const msg = `DELETE failed to delete Watchdog ID [${req.id}] [${error.data || error.stack || error}]`
    logger.error(msg)
    res.status(error.code).end()
  }
})

// get basic stats for homepage
authRouter.get('/stats', async (req, res) => {
  try {
    const result = await handleDB.getStats(req.uuid)
    res.status(result.code).send(result.data)
  } catch (error) {
    const msg = `GET failed to get stats [${error.data || error.stack || error}]`
    logger.error(msg)
    res.status(error.code).send(error.data)
  }
})

// get app's settings
authRouter.get('/settings', async (req, res) => {
  try {
    const result = await handleDB.getSettings(req.uuid)
    res.status(result.code).send(result.data)
  } catch (error) {
    const msg = `GET failed to get settings [${error.data || error.stack || error}]`
    logger.error(msg)
    res.status(error.code).send(error.data)
  }
})

// update app's settings
authRouter.put('/settings', async (req, res) => {

  const data = req.body // input data about new item

  let errors = validate.email(data.email)

  if (errors.length === 0) { // if validation ok

    try {

      let activationLinkSent = false
      const oldEmail = await handleDB.getEmail(req.uuid)

      if (data.email !== "" && data.email !== oldEmail.data) {

        await handleDB.checkEmailDuplicity(data.email)

        // email address is going to change, must generate new associated keys
        const unsubKeyUrl = generateUnsubscribeKeyUrl()
        const actKeyUrl = generateActivationKeyUrl()
        data.unsubscribeKey = unsubKeyUrl.key
        data.activationKey = actKeyUrl.key

        // sending email with activation link
        const subject = 'Activate your email'
        const message = `Please open following activation link in your web browser: ${actKeyUrl.url} `
        await sendMail(data.email, subject, message, true, unsubKeyUrl.key)
        activationLinkSent = true
      }

      const updated = await handleDB.updateSettings(data, req.uuid)
      let msgs = []
      if (activationLinkSent) {
        const msg = `An activation link has been sent to ${data.email}. Please follow the email instructions to proceed.`
        msgs.push(msg)
      }
      msgs.push(updated.data)
      res.status(updated.code).send({data: msgs})

    } catch (error) {
      const msg = `PUT failed to update settings [${error.data || error.stack || error}]`
      logger.error(msg)
      const data = error.data ? error.data : serErr
      res.status(500).send({data: data})
    }
  } else { // if validation not ok, return error messages related to failed validation
    res.status(400).send({data: errors})
  }
})

// get logs
authRouter.get('/logs', async (req, res) => {

  const validateLogFilter = validate.logFilter(req.query) // validate form data

  if (validateLogFilter.length === 0) { // if validation ok
    try {
      const result = await handleDB.getLogs(req.query, req.uuid)
      res.status(result.code).send(result)
    } catch (error) {
      const msg = `GET failed to get settings [${error.data || error.stack || error}]`
      logger.error(msg)
      const code = error.code ? error.code : 500
      const data = error.data ? error.data : serErr
      res.status(code).send({data: data})
    }
  } else {  // if validation not ok, return error messages related to failed validation
    res.status(400).send({data: validateLogFilter})
  }
})

// get app's self logs
authRouter.get('/selflogs', async (req, res) => {
  try {
    const result = await handleDB.getSelfLogs()
    res.status(result.code).send(result.data)
  } catch (error) {
    const msg = `GET failed to get self-logs [${error.data || error.stack || error}]`
    logger.error(msg)
    const code = error.code ? error.code : 500
    const data = error.data ? error.data : serErr
    res.status(code).send(data)
  }
})

// saving auth token string to http cookie
function saveTokenToCookie(token, res) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'None',
    secure: true
  })
}

// authentication middleware
async function authenticate (req, res, next) {

    const token = req.cookies.token

    try {

      // check if token is still valid
      const loggedIn = await handleDB.isTokenLoggedIn(token)

      jwtVerify(token, process.env.JASMA_JWT_SECRET)

      const uuid = await handleDB.getUUIDbyToken(token)

      res.setHeader('uuid', uuid)
      req.uuid = uuid

      next()

    } catch (error) {
      res.status(401).send({message: 'Unauthorized'})
    }

}

export { app, passiveLogs }
