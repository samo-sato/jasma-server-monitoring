import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { generateRandomString, urlBaseWithPort, widLength } from '../src/globals.js'
import { isNotUnsubscribed, isActivated } from './handleDB.js'
import { activationEndpoint, activationParam, unsubscribeEndpoint, unsubscribeParam } from './constants.js'

// import React environment variables from ".env" file
import dotenv from 'dotenv'
dotenv.config()

// logger
import winston from 'winston'
export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf((info) => {
      // Explicitly specify the order of properties
      return JSON.stringify(
        {
          timestamp: info.timestamp,
          level: info.level,
          message: info.message,
        },
        null, // it specifies how values are stringified
        2 // space indentation
      )
    })
  ),
  transports: [
    new winston.transports.File({filename: './backend/logs'}),
    //new winston.transports.Console(), // console.logs logs
  ],
})

// generates activation hyperlink and key that would be sent in email to user as response to email address change
export function generateActivationKeyUrl() {

  const key = generateRandomString(40)

  const url = `${urlBaseWithPort(process.env.REACT_APP_PUBLIC_PORT_API, true)}/${activationEndpoint}?${activationParam}=${key}`

  return {
    key: key,
    url: url
  }

}

// generates unsubscribe hyperlink and key that would be added as footer to every sent email
// if optional key parameter provided, then key associated hyperlink will be generated (instead of random one)
export function generateUnsubscribeKeyUrl(optionalKey) {

  // validate optionalKey if provided
  if (typeof optionalKey !== 'string' && optionalKey === '') {
    throw new Error('Invalid unsubscribe key')
  }

  const key = optionalKey ? optionalKey : generateRandomString(40)

  const url = `${urlBaseWithPort(process.env.REACT_APP_PUBLIC_PORT_API, true)}/${unsubscribeEndpoint}?${unsubscribeParam}=${key}`

  return {
    key: key,
    url: url
  }

}

// generates UUID string for new User (used as their ID)
export function generateUUID() {
  const bytes = crypto.randomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // Set version to 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // Set variant to RFC4122
  return bytes.toString('hex').match(/(.{8})(.{4})(.{4})(.{4})(.{12})/).slice(1).join('-')
}

// takes plain text password with salt and makes hash from it
export function saltedPwHash(password, salt) {
  return hash(password + salt)
}

// returns sha256 hash of given string
export function hash(string) {

  // Create a hash object
  const hasha256 = crypto.createHash('sha256')

  // Update the hash object with the password
  hasha256.update(string)

  // Get the hashed password as a hexadecimal string
  const hashedString = hasha256.digest('hex')

  return hashedString
}

// returns current UTC timestamp in format: YYYY-MM-DD HH:MM UTC
// optional unix timestamp (ms) can be provided as parameter to return associated time
export function getCurrentDateTimeUTC(customTimestamp) {

  const timestamp = customTimestamp ? customTimestamp : Date.now()

  const dateInUTC = new Date(timestamp)
  const year = dateInUTC.getUTCFullYear()
  const month = String(dateInUTC.getUTCMonth() + 1).padStart(2, '0') // Months are zero-based
  const day = String(dateInUTC.getUTCDate()).padStart(2, '0')
  const hours = String(dateInUTC.getUTCHours()).padStart(2, '0')
  const minutes = String(dateInUTC.getUTCMinutes()).padStart(2, '0')

  const formattedDateTimeUTC = `${year}-${month}-${day} ${hours}:${minutes} UTC`

  return formattedDateTimeUTC
}

export function generateWatchdogId() {
  return generateRandomString(widLength)
}

// function for sending mails
// function is dependent on nodemailer module and environment variables that provide settings to nodemailer
// message will be appended with additional general informations
// optional parameter "activation" is a boolean flag: when set to true, it indicates that an activation email is being sent. In this case, the function does not perform a check to verify whether the email is already activated
// optional parameter "newUnsubKey" is new unsubscription key to be used instead of default unsubscription key (unsubscription key is used in message footer to allow user to unsubscribe from receiving emails)
export function sendMail(recipient, subject, message, activation, newUnsubKey) {

  return new Promise(async (resolve, reject) => {

    try {

      // check if recipient email address was not unsubscribed and get "unsubKey"
      // use "newUnsubKey" instead if provided in function parameter
      let unsubKey = await isNotUnsubscribed(recipient)
      unsubKey = newUnsubKey || unsubKey.data

      // check if email address is activated, in case activation email is NOT being sent (activation !== true)
      if (activation !== true) { await isActivated(recipient) }

      // generate unsubscribe hyperlink based on unsubscribe_key
      const linkToUnsub = generateUnsubscribeKeyUrl(unsubKey).url

      const footer = `
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  Why this message?
  We apologize if you did not intend to receive this automated email. It was sent from ${urlBaseWithPort(process.env.REACT_APP_PUBLIC_PORT_WEB, false)} because you (or someone else) once entered your email address into our web app to receive notifications from server monitoring.
  How to unsubscribe:
  To permanently unsubscribe please click on the following link: ${linkToUnsub}
  Thank you for using ${urlBaseWithPort(process.env.REACT_APP_PUBLIC_PORT_WEB, false)} for your server monitoring needs.`

      // prepare transport data settings for nodemailer
      const transportOptions = {}

      // server address handling outgoing mails
      if ( process.env.JASMA_MAIL_HOST ) { transportOptions.host = process.env.JASMA_MAIL_HOST }

      // the port to which the mail server is configured to listen
      if ( process.env.JASMA_MAIL_PORT ) { transportOptions.port = process.env.JASMA_MAIL_PORT }

      // secure connection can be: true, false, or not set
      if ( process.env.JASMA_MAIL_SECURE.toLowerCase() === 'true' ) { transportOptions.secure = true }
      if ( process.env.JASMA_MAIL_SECURE.toLowerCase() === 'false') { transportOptions.secure = false }

      // login and password for mail server
      const user = process.env.JASMA_MAIL_USER
      const pass = process.env.JASMA_MAIL_PASS
      if (user || pass) { transportOptions.auth = {} }
      if (user) { transportOptions.auth.user = user }
      if (pass) { transportOptions.auth.pass = pass }

      // do or do not fail on invalid certs
      let rejectUnauthorized = null
      if ( process.env.JASMA_MAIL_TLS_REJECT_UNAUTHORIZED.toLowerCase() === 'false') { rejectUnauthorized = false }
      if ( process.env.JASMA_MAIL_TLS_REJECT_UNAUTHORIZED.toLowerCase() === 'true' ) { rejectUnauthorized = true }
      if (rejectUnauthorized !== null) {
        transportOptions.tls = {
          rejectUnauthorized: rejectUnauthorized
        }
      }

      // DKIM settings: domain name, key selector, private key for the selector in PEM format
      const dkimD = process.env.JASMA_MAIL_DKIM_DOMAIN
      const dkimS = process.env.JASMA_MAIL_DKIM_SELECTOR
      const dkimP = process.env.JASMA_MAIL_DKIM_PRIVKEY

      if (dkimD || dkimS || dkimP) { transportOptions.dkim = {} }

      if ( dkimD ) { transportOptions.dkim.domainName = process.env.JASMA_MAIL_DKIM_DOMAIN }
      if ( dkimS ) { transportOptions.dkim.keySelector = process.env.JASMA_MAIL_DKIM_SELECTOR }
      if ( dkimP ) { transportOptions.dkim.privateKey = process.env.JASMA_MAIL_DKIM_PRIVKEY }

      // prepare email settings for nodemailer
      const mailOptions = {}

      // sender's address shown to the recipient
      const fromAddress = process.env.JASMA_MAIL_FROM_ADDRESS

      // sender's name shown to thr recipient
      const fromName = process.env.JASMA_MAIL_FROM_NAME

      if (fromAddress || fromName) { mailOptions.from = {} }
      if (fromAddress) { mailOptions.from.address = fromAddress }
      if (fromName) { mailOptions.from.name = fromName }

      mailOptions.to = recipient
      mailOptions.subject = subject
      mailOptions.text = `${message}${footer}`

      // console.log('transportOptions', transportOptions)
      // console.log('mailOptions', mailOptions)

      // try to send the email with prepared settings
      const transporter = nodemailer.createTransport(transportOptions)
      await transporter.sendMail(mailOptions)

      const msg = `Message sent [${recipient}], subject [${subject}]`
      logger.info(msg)
      resolve({
        code: 200,
        data: 'Mail sent',
      })

    } catch (error) {

      const msg = `Mailing to [${recipient}], with subject [${subject}] has failed`
      logger.error(`${msg} [${error.stack || error.data || error}]`)
      reject({
        code: error.code || 500,
        data: error.data || 'Mailing failed',
      })

    }

  })

}
