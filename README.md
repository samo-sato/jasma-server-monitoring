# JASMA Server Monitoring

## Table of Contents
- [Overview](#overview)
- [Live Demo](#live-demo)
- [Features](#features)
  - [Server Monitoring and using Watchdogs](#server-monitoring-and-using-watchdogs)
  - [Email notifications](#email-notifications)
  - [User login and accounts](#user-login-and-accounts)
  - [Theme mode settings](#theme-mode-settings)
  - [Logging](#logging)
  - [Rate Limiting](#rate-limiting)
- [Tech used](#tech-used)
- [Deployment](#deployment)
  - [Clone](#clone)
  - [Install](#install)
  - [Set environment variables](#set-environment-variables)
  - [Create database tables](#create-database-tables)
  - [Seed database tables and choose password](#seed-database-tables-and-choose-password)
  - [Deploying under base-path URL (optional)](#deploying-under-base-path-url-optional)
  - [Run application](#run-application)

## Overview
**JASMA** (**J**ust **A**nother **S**erver **M**onitoring **A**pp) is web app that monitors and logs the status of remote servers or services using http protocol. The app can send email notifications and allows users to create multiple accounts.

## Live Demo
You can explore the JASMA web app through the live demo at the following URL: https://www.turis.dev/jasma
Feel free to create a user account without providing an email or any other details.
**Warning:** *The live demo is not intended for actual server monitoring. It is just a learning project and the website owner reserves the right to delete or modify any data on the server.*

## Features

### Server Monitoring and using Watchdogs
Users can add, edit, and remove Watchdogs. A Watchdog is responsible for monitoring specific remote server. Each Watchdog is associated with specific User and it operates in one of the following modes:

1. **Active Mode Monitoring**
The Watchdog is making requests to user defined URL endpoint. If given endpoint provides response with status code in 2xx range, the Watchdog considers the status of such server as *ok*, otherwise as *not ok*.

2. **Passive Mode Monitoring**
The Watchdog listens for any request on a specific URL endpoint. If a request is received within the monitoring interval, the Watchdog considers considers status of monitored server as *ok*, otherwise as *not ok*.

### Email notifications
The Watchdog can trigger email notifications. Following conditions must be met to receive email notifications:
 - Backend mailer must have correct settings via [environment variables](#set-environment-variables).
 - User must save a valid email in the frontend web UI settings
 - The user must receive an email with an activation link and confirm it
 - User must enable email notifications for desired Watchdogs (via editing or adding Watchdog in frontend eb UI)
 - Given email address must not be unsubscribed

Email is handled by [Nodemailer](https://nodemailer.com/) module.

### User login and accounts
Master User logs into frontend web UI using password defined during [seeding the tables](#seed-database-tables-and-choose-password).
Multiple non-master user accounts (demo accounts) can be created from the main web login page. After account is generated, new User password is shown only once. With this password, the non-master User can perform future logins into the frontend web UI. Only limitation of non-master User is maximum amount of Watchdogs as defined in [environment variables](#set-environment-variables).

### Theme mode settings
In the frontend web UI's upper corner menu, User can toggle between *light/dark/auto* theme modes. In case auto theme mode is toggled, switching between light or dark theme styles is performed automatically based on the current hour of day on the client side. These threshold hours can be modified in [environment variables](#set-environment-variables).

### Logging
Logging performed in *"runs"* periodically at specific time intervals, as defined in [environment variables](#set-environment-variables). During each *"run"*, different types of logs are being generated, stored or displayed and if enabled, email notifications might be sent. There are four types of logs:

1. **Main logs**
Each log is associated with a specific Watchdog. Logs can be viewed on the frontend web UI *Logs* page. Different filters can be applied on search function to display only specific types of logs. These logs are stored in designated database table. Main logs can have one of the following status:

    - **0** => *not ok*, server has not provided valid response
    - **1** => *ok*, server has provided valid response

2. **Self-logs**
Any previous outages or other breaks in server monitoring app are picked up by self-logs and can be viewed in frontend web UI *Self-logs* page.
These logs are stored in designated database table. Self-logs are global for whole app and not User specific.

3. **System logs**
Information about errors and selected events that occur during backend code execution is stored into `backend/logs` file as JSON. Logging is done by [Winston](https://www.npmjs.com/package/winston) logger module.

4. **Real time console logging (CLI)**
As `backend/server.js` runs in the background, structured information from real-time server monitoring can be viewed in the console output. This feature is especially useful for debugging and quickly grasping the operation of the application.

### Rate Limiting
Rate limiting function is implemented using [Express Rate Limit](https://www.npmjs.com/package/express-rate-limit) middleware. Rate limit thresholds can be modified directly in the `backend/api/endpoints.js` file.

## Tech used
This app is primarily built using the following technologies:
- [Node.js](https://nodejs.org)
- [Express](https://expressjs.com/)
- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org/)
- [SQLite (for node)](https://github.com/TryGhost/node-sqlite3)
- HTML and CSS

## Deployment
Public deployment has been tested on Linux Ubuntu 20 (running on a VPS), and local deployment was tested on Linux Mint 20 (running on a PC).

1. ### Clone
Download or clone repository files to your machine.

2. ### Install
    1. Make sure *nodejs* is installed
    2. Make sure *npm* is installed
    3. Install dependency packages using `npm install` command within project directory

3. ### Set environment variables
This application requires two sets of environment variables, some of which must be defined before starting:

  - **Exposed environment variables** with `REACT_APP_` prefix
**Warning:** *"Exposed" variables are publicly accessible and should not contain sensitive information. Note that some of these variables are accessed both by frontend and backend using [`dotenv`] module.*

  - **Secret environment variables** with `JASMA_` prefix
**Warning:** *"Hidden" variables contain sensitive data.*

### How to set environment variables
All environment variables are sourced from file `.env`. Create this file by copying and renaming `.env.example` which already includes all necessary environment variables and descriptions. Many variables already have default values, but those without a pre-assigned value and marked as `Required` must be assigned value before starting the application.

4. ### Compile TypeScript files
Run `npx tsc` to compile TypeScript files into JavaScript files

5. ### Create database tables
Run file `backend/db/create_tables.js`. This will create a database file in the same directory filled with tables necessary for the app.

6. ### Seed database tables and choose password
Run file `backend/db/seed_tables.js`. This will ask you to write the password to console. Write password and hit enter. You will use this password later to log in to the frontend web UI as the master User. After password is accepted, the tables will be filled with first data.

7. ### Deploying under base-path URL (optional)
In case of deployment under specific path, for example https://www.example.org/jasma, the following steps should be taken:
 - Add *homepage* property into `package.json` file with value of desired base path (eg. `"homepage": "jasma",`)
 - Assign desired base path to exposed environment variable *REACT_APP_BASE_PATH* in `.env` file (eg. `REACT_APP_BASE_PATH=jasma`)
 - Adjust settings of your web server to accommodate new base path if necessary

8. ### Run application
    1. Run the backend and API server by executing `backend/server.js` file in the background.
    2. Serve the frontend web UI by either running the development server using `npm start` which should open frontend web UI automatically in the browser or make React build `npm run build` and serve the `build` folder with static web files using a tool like *serve*, *http-server* or similar.
