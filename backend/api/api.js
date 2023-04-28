const path = require('path')
const express = require('express')
const app = express()

// some general parameters
const { constants } = require(path.resolve(__dirname, '..', '..', 'src', 'constants'))

// cors middleware
const cors = require('cors')
app.use(cors({
    origin: true,
    credentials: true
}))

// handling cookies
const cookieParser = require('cookie-parser')
app.use(cookieParser())

// auth
const jwt = require('jsonwebtoken')

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

// methods for working with data inside DB
const { handleDB, validate, privateIdGenerator } = require(path.resolve(__dirname, 'methods'))

// authentication middleware
function authenticate (req, res, next) {
  const token = req.cookies.token
  handleDB.isTokenLoggedIn(token)
    .then(response => {
      if (response.data === true) { // token is valid and still not logged-out by user
        jwt.verify(token, process.env.JASMA_jwt_secret, (error, decoded) => {
          if (error) {
            let msg = 'Token did not pass JWT verification'
            console.log(msg)
            res.status(401).json({ message: msg })
          } else {
            next()
          }
        })
      } else {
        res.status(401).json({ message: 'Token validation error' })
      }
    })
    .catch(error => {
      res.status(error.code).json({ message: 'Token expired' })
    })
}

// this API endpoint handles requests from services in "passive" mode
// each hit of given endpoint with given parameter will create temporary log with timestamp and id
let passiveLogs = [] // in this variable will be stored temporary logs, it will be exported and use in another script for further processing
app.get(`/${constants.urlPassiveMode}/:privateId`, (req, res) => {

  const privateId = req.params.privateId // extracting Private ID from the request (it identifies related Watchdog/service)
  const timestamp = Date.now() // current unix epoch timestamp

  // update the timestamp of given id in array with temporary logs if needed
  let logUpdated = false
  passiveLogs.forEach((value, index) => {
    if (value.privateId === privateId) {
      passiveLogs[index].timestamp = timestamp // update the timestamp
      logUpdated = true
    }
  })

  // if the log with privateId from request does not exist yet in our log array, we need to add it there
  if (!logUpdated) {
    passiveLogs.push({
      privateId: privateId,
      timestamp: timestamp
    })
  }

  // export the temporary log array, it will be used in another script for further processing
  module.exports = { passiveLogs }

  // initiate the response with hopefully at least some protection against DDoS
  setTimeout(() => {
    res.status(200).json({
      message: 'Log created'
    })
  }, 1000)

})

// endpoint for users without authentication (login page)
app.post('/login', async (req, res) => {
  const { userName, password} = req.body

  // Perform authentication and validation
  if (userName === process.env.JASMA_user_login && password === process.env.JASMA_user_pw) { // if correct credentials given

    // handling the authentication
    handleDB.getParams() // getting token expiration time from DB
      .then(params => {
        const token = jwt.sign({ userName }, process.env.JASMA_jwt_secret, { expiresIn: params.data.token_expiration }) // create auth token using JWT module

        // save auth token to DB
        handleDB.saveToken(token)
          .then(response => {
            if (response.data === true) { // token was saved to DB
              res.status(response.code).json({ message: 'Authorized' })
            } else {
              res.status(500).json({ message: 'Unknown error' })
            }
          })
          .catch(error => {
            console.log(error.data)
            res.status(error.code).json({ message: 'Database error' })
          })

        // save token to cookie
        res.cookie('token', token, {
          httpOnly: true,
          sameSite: 'Lax'
        })
      })
      .catch(error => {
        console.log(error)
        res.status(error.code).json({message: 'Server error'})
      })

  } else {
    res.status(401).json({message: 'Invalid credentials'})
  }

})

// get user login status using special middleware
app.get('/authorized', authenticate, async (req, res) => {

  // convert current datetime to "YYYY-MM-DD HH:MM" format
  function getDatetime() {
    const today = new Date(Date.now()) // Create a new Date object with the current date

    // Get the year, month, and day from the Date object
    const year = today.getUTCFullYear()
    const month = String(today.getUTCMonth() + 1).padStart(2, '0') // Months are zero-indexed, so we add 1
    const day = String(today.getUTCDate()).padStart(2, '0')
    const hour = String(today.getUTCHours()).padStart(2, '0')
    const minute = String(today.getUTCMinutes()).padStart(2, '0')
    const timeFormatted = `${year}-${month}-${day} ${hour}:${minute}` // Combine the year, month, and day into a single string in the desired format
    return timeFormatted
  }

  // artificial delay for testing - remove before flight
  // setTimeout(() => {

    // response with login status and time information
    res.status(200).json({
      authorized: true,
      time: getDatetime()
    })

  // }, 1000)

})

// using "express router" in order to always use "api" path at begining of endpoint url
const router = express.Router()
app.use('/api', authenticate, router)

// root endpoint for users with authentication
router.get('/', (req, res) => {
  res.send('API server')
})

// endpoint for user logout
router.post('/logout', async (req, res) => {

  const token = req.cookies.token // loading token from cookie

  if (token) {
    handleDB.logoutToken(token)
      .then(response => {
        if (response.data === true) { // token status changed to being logged out
          res.cookie('token', '', { expires: new Date(0) }) // delete cookie token
          res.status(response.code).json({ message: 'Logout successful' })
          console.log('User logged out')
        } else { // unknown error
          res.status(error.code).json({ message: 'Logout error' })
        }

      })
      .catch(error => { // token is probably already logged out
        console.log(error)
        res.status(error.code).json({ message: 'Token is already logged out' })
      })
  } else {
    let msg = 'Token cookie does not exist'
    console.log()
    res.status(400).json({ message: msg })
  }
})

// id param validation middleware
router.param('id', (req, res, next, idParam) => {
  const id = Number(idParam)
  if (Number.isInteger(id) && id > 0) {
    req.id = id
    next()
  } else {
    next('Id validation failed')
  }
})

// get all items from "Watchdog" table
router.get('/watchdogs', async (req, res) => {
  try {
    const result = await handleDB.getWatchdogs()
    res.status(result.code).send(result.data)
  } catch (rejectVal) {
    res.status(rejectVal.code).send(rejectVal.data)
  }
})

// get signle item from "Watchdog" table
router.get('/watchdogs/:id', async (req, res) => {
  try {
    const result = await handleDB.getWatchdog(req.id)
    res.status(result.code).send(result.data)
  } catch (rejectVal) {
    res.status(rejectVal.code).send(rejectVal.data)
  }
})

// updating item inside "Watchdog" table
router.put('/watchdogs/:id', async (req, res) => {

  const data = req.body // input data about new item
  const validateData = validate.watchdog(data) // input data validation

  if (validateData === true) { // if validation ok
    try {
      const result = await handleDB.updateWatchdog(req.id, data)
      res.status(result.code).send({data: result.data})
    } catch (rejectVal) {
      res.status(rejectVal.code).send({data: rejectVal.data})
    }
  } else { // if validation not ok, return error messages related to failed validation
    res.status(400).send({data: validateData})
  }
})

// adding item into "Watchdog" table
router.post('/watchdogs', async (req, res) => {

  const data = req.body // input data about new item
  const validateData = validate.watchdog(data)

  if (validateData === true) { // if validation ok
    try {
      const result = await handleDB.addWatchdog(data)
      res.status(result.code).send({data: result.data})
    } catch (rejectVal) {
      res.status(rejectVal.code).send({data: rejectVal.data})
    }
  } else { // if validation not ok, return error messages related to failed validation
    res.status(400).send({data: validateData})
  }

})

// deleting item inside "Watchdog" table
router.delete('/watchdogs/:id', async (req, res) => {
  try {
    const result = await handleDB.deleteWatchdog(req.id)
    res.status(result.code).end() // DELETE response can not contain body
  } catch (rejectVal) {
    res.status(rejectVal.code).end()
  }
})

// get basic stats for homepage
router.get('/stats', async (req, res) => {
  try {
    const result = await handleDB.getStats()
    res.status(result.code).send(result.data)
  } catch (rejectVal) {
    res.status(rejectVal.code).send(rejectVal.data)
  }
})

// get app's parameters
router.get('/parameters', async (req, res) => {
  try {
    const result = await handleDB.getParams()
    res.status(result.code).send(result.data)
  } catch (rejectVal) {
    res.status(rejectVal.code).send(rejectVal.data)
  }
})

// update app's parameters
router.put('/parameters', async (req, res) => {

  const data = req.body // input data about new item
  const validateParams = validate.params(data)

  if (validateParams === true) { // if validation ok
    try {
      const result = await handleDB.updateParams(data)
      res.status(result.code).send({data: result.data})
    } catch (rejectVal) {
      res.status(rejectVal.code).send({data: rejectVal.data})
    }
  } else { // if validation not ok, return error messages related to failed validation
    res.status(400).send({data: validateParams})
  }
})

// get logs
router.get('/logs', async (req, res) => {

  const validateLogFilter = validate.logFilter(req.query) // validate form data

  if (validateLogFilter === true) { // if validation ok
    try {
      const result = await handleDB.getLogs(req.query)
      res.status(result.code).send(result)
    } catch (rejectVal) {
      res.status(rejectVal.code).send(rejectVal.data)
    }
  } else {  // if validation not ok, return error messages related to failed validation
    res.status(400).send({data: validateLogFilter})
  }
})

// get app's self logs
router.get('/selflogs', async (req, res) => {
  try {
    const result = await handleDB.getSelfLogs()
    res.status(result.code).send(result.data)
  } catch (rejectVal) {
    res.status(rejectVal.code).send(rejectVal.data)
  }
})

module.exports = { app, passiveLogs }
