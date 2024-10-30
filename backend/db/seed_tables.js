// tables have to be created first, there is another script for that
// this code prompts user to enter master User password (creating new password for web UI) and seeds app's tables with first data

// modules for prompt functionality
// user will be prompted to enter (choose) master User password for web UI
import readline from 'readline'
import { Writable } from 'stream'

import { hash, generateUUID, generateWatchdogId, saltedPwHash } from '../functions.js'

// import shared environment variables from ".env" file
import dotenv from 'dotenv'
dotenv.config()

// database will be used to seed the tables
import sqlite3 from 'sqlite3'
const db = new sqlite3.Database('./backend/db/service_monitor.db')

// load salt string from environment variable to hash the password
const salt = process.env.JASMA_SALT

// minimum length of password user will be prompted to enter
const minPwLength = 8

// generate Watchdog ID for first Watchdog
const watchdogID = generateWatchdogId()

// salt environment variable validation
if (!salt || salt === '') { throw new Error('Invalid salt environment variable') }

// create a writable stream to handle the prompt
const mutableStdout = new Writable({
  write: function(chunk, encoding, callback) {
    if (!this.muted)
      process.stdout.write(chunk, encoding)
    callback()
  }
})

// set initial muted state and create a readline interface
mutableStdout.muted = false
const rl = readline.createInterface({
  input: process.stdin,
  output: mutableStdout,
  terminal: true
})


let password

// Use the readline interface to ask the user for input
rl.question('Choose your master User password for web UI: ', async function(password) {

  // password validation
  if (password.length < minPwLength) { throw new Error(`Password is too short. Minimum required length is ${minPwLength}.`) }

  // seed the tables
  try {
    await seedTables(password)
  } catch (error) {
    console.error(error)
  }

  // close the readline interface
  rl.close()

})
mutableStdout.muted = true

function seedTables(password) {

  return new Promise((resolve, reject) => {

    // add data to tables
    let sql
    let params
    let firstMasterUUID = generateUUID()
    db.serialize(function () {

      // seed "User" table with first data
      sql = `
        INSERT INTO User (
            uuid,
            hash,
            master
          ) VALUES (
            $uuid,
            $hash,
            1
          );`
      params = {
        $uuid: firstMasterUUID,
        $hash: saltedPwHash(password, salt)
      }
      db.run(sql, params, function (error) {
        if (error) {
          console.log(error)
          reject()
        } else {
          console.log(`Data inserted into "User" table`)
        }
      })

      // seed "Watchdog" table with first data
      sql = `
        INSERT INTO Watchdog (
            id,
            uuid_user,
            name,
            url,
            passive,
            email_notif,
            enabled
          ) VALUES (
            $id,
            $uuid,
            "First example",
            "https://www.example.org",
            0,
            0,
            1
          );`
      params = {
        $id: watchdogID,
        $uuid: firstMasterUUID
      }
      db.run(sql, params, function (error) {
        if (error) {
          console.log(error)
          reject()
        } else {
          console.log(`Data inserted into "Watchdog" table`)
          resolve()
        }
      })

    })

  })

}
