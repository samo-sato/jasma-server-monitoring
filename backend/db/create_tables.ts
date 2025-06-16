// This code creates empty DB tables necessary to run the app
// If particular table already exists, it will not be created
// Used DB system: sqlite3

// Import shared environment variables from ".env" file
import dotenv from 'dotenv';
dotenv.config();

import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./backend/db/service_monitor.db');

import { toInt, validateEnv } from '../../src/utils.js';

const REACT_APP_DEF_THRESHOLD = validateEnv(process.env.REACT_APP_DEF_THRESHOLD, true);

// Array of objects with names and schema sql for each table
const tableData = [
  {
    // Table `User` will contain user data
    name: 'User',
    get sql() {

      return `
      CREATE TABLE IF NOT EXISTS ${this.name} (
        uuid TEXT PRIMARY KEY UNIQUE,
        hash	TEXT NOT NULL UNIQUE,
        master INTEGER NOT NULL DEFAULT 0,
        email TEXT DEFAULT NULL,
        email_active INTEGER NOT NULL DEFAULT 0,
        activation_key TEXT DEFAULT NULL,
        unsubscribe_key TEXT DEFAULT NULL
      );`
    }
  },
  {
    // Table `Unsubscribed` will contain email ubsubscribed addresses
    name: 'Unsubscribed',
    get sql() {
      return `
      CREATE TABLE IF NOT EXISTS ${this.name} (
        email TEXT UNIQUE
      );`
    }
  },
  {
    // Table `Token` will contain login data
    name: 'Token',
    get sql() {
      return `
      CREATE TABLE IF NOT EXISTS ${this.name} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid_user TEXT NOT NULL,
        token	TEXT NOT NULL UNIQUE,
        valid	INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (uuid_user) REFERENCES User(uuid)
      );`
    }
  },
  {
    // Table `Watchdog` will contain `Watchdogs` which represent server monitoring agents, each Watchdog monitors specific url endpoint of service or server
    name: 'Watchdog',
    get sql() {
      return `
      CREATE TABLE IF NOT EXISTS ${this.name} (
        id TEXT PRIMARY KEY UNIQUE,
        uuid_user INTEGER NOT NULL,
        name	TEXT NOT NULL,
        url	TEXT NULL,
        passive	INTEGER NOT NULL,
        email_notif	INTEGER NOT NULL,
        enabled	INTEGER NOT NULL,
        threshold INTEGER DEFAULT ${toInt(REACT_APP_DEF_THRESHOLD)},
        FOREIGN KEY (uuid_user) REFERENCES User(uuid)
      );`
    }
  },
  {
    // Table `Watchdog_log` will contain logs with results from server monitoring from each Watchdog
    name: 'Watchdog_log',
    get sql() {
      return `
      CREATE TABLE IF NOT EXISTS ${this.name} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp_start	INTEGER NOT NULL,
        timestamp_stop	INTEGER NOT NULL,
        id_watchdog	TEXT NOT NULL,
        status	INTEGER NOT NULL,
        note	TEXT NOT NULL,
        FOREIGN KEY(id_watchdog) REFERENCES Watchdog(id)
      );`
    }
  }
]

// Creating tables if they do not exist
// Doing all tables at once by looping throug array of objects with table data
tableData.forEach((table) => {

  // First check if table already exists
  db.get(`SELECT name FROM sqlite_master WHERE name = '${table.name}';`, function (err, row) {
    if (err) {
      console.log(`Error while checking if table ${table.name} elready exists: ${err}`);
    } else if (!row) { // Table does not exist yet, so we can create it
      db.run(table.sql, function (err) {
        if (err) {
          console.log(`Error while creating "${table.name}" table: ${err}`);
        } else {
          console.log(`Table "${table.name}" was created`);
        }
      })
    } else {
      console.log(`Table "${table.name}" already exists`);
    }
  })

})