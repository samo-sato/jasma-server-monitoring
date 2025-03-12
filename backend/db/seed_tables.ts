// Tables have to be created first, there is another script for that
// This code also prompts user to enter master User password (creating new password for web UI) and seeds app's tables with first data

// Import functions and variables
import { hash, generateUUID, generateWatchdogId, saltedPwHash } from '../functions.js';
import { validateEnv } from '../../src/utils.js';

// Import shared environment variables from `.env` file
import dotenv from 'dotenv';
dotenv.config();

// Modules for prompt functionality
// User will be prompted to enter (choose) master User password for web UI
import readline from 'readline';
import { Writable } from 'stream';

// Database will be used to seed the tables
import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./backend/db/service_monitor.db');

// Load salt string from environment variable to hash the password
const JASMA_SALT = validateEnv(process.env.JASMA_SALT, true);

// Minimum length of password user will be prompted to enter
const minPwLength = 8;

// Generate Watchdog ID for first Watchdog
const watchdogID = generateWatchdogId();

// Create a custom writable stream that replaces input characters with `*`
const mutableStdout = new Writable({
  write(chunk, encoding, callback) {
    const text = chunk.toString(); // Ensure `text` is defined within this scope
    if (!(this as any).muted) {
      process.stdout.write(chunk, encoding);
    } else {
      // Write `*` for each character in the chunk (masking the password)
      process.stdout.write('*'.repeat(text.replace(/[\r\n]/g, '').length));
    }
    callback();
  }
}) as Writable & { muted: boolean };

mutableStdout.muted = false; // Do not mask characters initially

const rl = readline.createInterface({
  input: process.stdin,
  output: mutableStdout, // Use `mutableStdout` as the output to apply masking
  terminal: true
});

// Display prompt text before activating the mask
rl.question('Choose your master User password: ', async (pw) => {
  mutableStdout.muted = false;  // Disable masking after input is complete

  // Password validation
  if (pw.length < minPwLength) {
    throw new Error(`Password is too short. Minimum required length is ${minPwLength}.`)
  }

  // Seed the tables
  try {
    await seedTables(pw);
  } catch (error) {
    console.error(error);
  }

  // Close the readline interface
  rl.close()
});

// Activate masking after the prompt is displayed
mutableStdout.muted = true;

/**
 * Seed tables with first data
 * @param password Master User password
 * @returns Promise<void>
*/
function seedTables(password: string): Promise<void> {

  return new Promise<void>((resolve, reject) => {

    // Add data to tables
    let sql
    let params
    let firstMasterUUID = generateUUID()
    db.serialize(function () {

      // Seed `User` table with first data
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
        $hash: saltedPwHash(password, JASMA_SALT)
      }
      db.run(sql, params, function (error) {
        if (error) {
          console.log(error);
          reject();
        } else {
          console.log(`Data inserted into "User" table`);
        }
      })

      // Seed `Watchdog` table with first data
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
          console.log(error);
          reject();
        } else {
          console.log(`Data inserted into "Watchdog" table`);
          resolve();
        }
      })

    })

  })

}
