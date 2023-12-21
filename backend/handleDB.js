import sqlite3 from 'sqlite3'
const db = new sqlite3.Database('./backend/db/service_monitor.db')
import { logger } from './functions.js'
const serErr = 'Server error' // generic error message

// resolves to object containing "data" property with "unsubscribe_key" as an value, in case given email was not yet unsubscribed
// rejetcs otherwise
export function isNotUnsubscribed(email) {

  return new Promise(async (resolve, reject) => {

    if (email === '') {
      resolve({
        code: 200,
        data: 'ok'
      })
    } else {

      // following query should return "unsubscribe_key" value for given email and...
      // in case email is unsubscribed: should return "is_unsubscribed" with value 1
      // in case email is not unsubscribed: should return "is_unsubscribed" with value 0
      const sql = `
      SELECT
      	(SELECT unsubscribe_key FROM User WHERE email = $email) as unsub_key,
      	(SELECT COUNT(email) FROM Unsubscribed WHERE email = $email) as is_unsubscribed
      ;`
      const params = { $email: email }

      db.get(sql, params, function (error, row) {
        if (error) {
          logger.error(error.stack)
          reject({
            code: 500,
            data: serErr
          })
        } else if (row['is_unsubscribed'] === 0)  {
          resolve({
            code: 200,
            data: row['unsub_key']
          })
        } else {
          const msg = `Email address [${email}] has been evaluated as unsubscribed`
          logger.info(msg)
          reject({
            code: 400,
            data: 'Same email address was unsubscribed, please try different address'
          })
        }
      })

    }

  })

}

// resolves in case given email address was activated
// rejetcs otherwise
export function isActivated(email) {

  return new Promise(async (resolve, reject) => {

      const sql = `
      SELECT
        email_active
      FROM
        User
      WHERE
        email = $email
      ;`
      const params = { $email: email }

      db.get(sql, params, function (error, row) {
        if (error) {
          logger.error(error.stack)
          reject({
            code: 500,
            data: serErr
          })
        } else if (!row) {
          const msg = `Status active for email [${email}] not found in DB`
          logger.error(msg)
          reject({
            code: 400,
            data: `New email address "${email}" is not activated`
          })
        } else if (row['email_active'] === 1)  {
          resolve({
            code: 200,
            data: 'Email is already activated'
          })
        } else {
          const msg = `Email address [${email}] has been evaluated as not activated in DB`
          logger.info(msg)
          reject({
            code: 400,
            data: `Email address "${email}" is not activated`
          })
        }
      })

  })

}
