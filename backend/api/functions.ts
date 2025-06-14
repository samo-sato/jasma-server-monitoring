// Import shared environment variables from `.env` file
import dotenv from 'dotenv';
dotenv.config();

// Import logger
import { handleError, logger } from '../functions.js';

// Json Web Token
import pkg from 'jsonwebtoken';
const { sign: jwtSign } = pkg;

import { toInt, validateEnv, widLength, WatchdogData, GenericPromiseReturn } from '../../src/utils.js';
import { saveToken } from './handleDB.js';

// Import and validate environment variables
const JASMA_JWT_SECRET             = validateEnv(process.env.JASMA_JWT_SECRET, true);
const JASMA_TOKEN_EXPIRATION       = validateEnv(process.env.JASMA_TOKEN_EXPIRATION, true) || '24h'; // Default to 24 hours if not set
const REACT_APP_MIN_WD_NAME_LENGTH = validateEnv(process.env.REACT_APP_MIN_WD_NAME_LENGTH, true);
const REACT_APP_MAX_WD_NAME_LENGTH = validateEnv(process.env.REACT_APP_MAX_WD_NAME_LENGTH, true);
const REACT_APP_MIN_WD_URL_LENGTH  = validateEnv(process.env.REACT_APP_MIN_WD_URL_LENGTH, true);
const REACT_APP_MAX_WD_URL_LENGTH  = validateEnv(process.env.REACT_APP_MAX_WD_URL_LENGTH, true);
const REACT_APP_MIN_THRESHOLD      = validateEnv(process.env.REACT_APP_MIN_THRESHOLD, true);
const REACT_APP_MAX_THRESHOLD      = validateEnv(process.env.REACT_APP_MAX_THRESHOLD, true);

// Define type of object representing query string from url in search / filter feature on web UI
export interface LogFilterQuery {
  datefrom: string;
  dateto: string;
  status0: string;
  status1: string;
  watchdogs: string;
}

/**
 * This function...
 * 1) Logs in User with given uuid
 * 2) Generates token (with given expiration time)
 * 3) Saves token to DB 
 *
 * @param uuid User's uuid
 * @returns Resolved promise with http code and signed token or rejected promise with http code and error message
*/
export function loginUser (uuid: string): Promise<GenericPromiseReturn> {

  return new Promise( async (resolve, reject) => {

    try {

      const signedToken = jwtSign({ user: uuid }, JASMA_JWT_SECRET, { expiresIn: JASMA_TOKEN_EXPIRATION }); // generate auth token using JWT module
      await saveToken(uuid, signedToken); // save auth token to DB
      resolve({
        code: 201,
        data: signedToken
      });

    } catch (error) {
      const msg = `User [${uuid}] login has failed`;
      const code = handleError(error, msg);
      reject({
        code: code,
        data: 'Login error'
      })
    }

  })

}

/**
 * Different methods for validating different data form inputs
 * Returned array is empty, if data evaluated as valid
 * Returned array contains error messages (strings), if data invalid
 * @params All methods accept data to be validated
 * @returns All methods return array with error messages as string. Empty array returned means data is valid.
 */
export const validate = {

  /**
   * Validate `Watchdog` data
   * @param data Watchdog data for validation
   */
  watchdog: function (data: WatchdogData) {

    // Input data preparation
    let adding = data.adding; // Validating Watchdog that is being added (adding = true) or edited (adding = false)
    let name = data.name;
    let url = data.url;
    let wid = data.id || null; // Watchdog ID => if adding passive mode watchdog with pre-generated Watchdog ID
    let enabled = data.enabled;
    let email_notif = data.email_notif;
    let threshold = data.threshold;
    let passive = data.passive;
    let errors = [];

    // Input type validation
    if (
      typeof name !== 'string' ||
      typeof url !== 'string' ||
      (enabled !== 0 && enabled !== 1) ||
      (email_notif !== 0 && email_notif !== 1) ||
      (adding && passive !== 0 && passive !== 1)
    ) {
      return ['Invalid input type'];
    }

    // If adding `passive mode` Watchdog, check wid length (if this not valid, user probably tried to manipulate input data in non-standard way)
    if (wid && passive === 1 && wid.length !== widLength) {
      return ['Invalid Watchdog ID length'];
    }

    // Input length validation
    const minWNL = toInt(REACT_APP_MIN_WD_NAME_LENGTH);
    const maxWNL = toInt(REACT_APP_MAX_WD_NAME_LENGTH);
    const minWUL = toInt(REACT_APP_MIN_WD_URL_LENGTH);
    const maxWUL = toInt(REACT_APP_MAX_WD_URL_LENGTH);
    const minThr = toInt(REACT_APP_MIN_THRESHOLD);
    const maxThr = toInt(REACT_APP_MAX_THRESHOLD);
    if (name.length < minWNL) { errors.push(`Minimum watchdog name length is ${minWNL}`) }
    if (name.length > maxWNL) { errors.push(`Maximum watchdog name length is ${maxWNL}`) }
    if (threshold < minThr) { errors.push(`Minimum notifying threshold is ${minWNL} consecutive "not ok" states`) }
    if (threshold > maxThr) { errors.push(`Maximum notifying threshold is ${maxWNL} consecutive "not ok" states`) }

    // Validate Watchdog URL, only if validating Watchdog in active mode
    if (passive === 0) {

      try {
        const parsedURL = new URL(url);
        if (parsedURL.protocol !== 'http:' && parsedURL.protocol !== 'https:')
          {
            throw new Error('Only http or https protocols are allowed');
          }
      } catch (error) {
        errors.push('URL string is not valid');
      }

      if (url.length < minWUL) { errors.push(`Minimum watchdog url length is ${minWUL}`) }
      if (url.length > maxWUL) { errors.push(`Maximum watchdog url length is ${maxWUL}`) }

    }

    return errors;
  },

  /**
   * Validate user's email
   * Empty string will be accepted, as it is considered as user's desire not to provide email
   * @param email Email for validation
   */
  email: function (email: string) {

    let errors = [];

    if (typeof email !== 'string') { return ['Email must be string'] }

    if (email === '') { return [] }

    // Check email address format
    const validateEmail = (email: string) => {
      return String(email)
        .toLowerCase()
        .match(
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
    }

    // Check if email address is in lower case
    if (email !== email.toLowerCase()) { errors.push('Email must be in lower case') }

    // Check email address format
    if (!validateEmail(email)) { errors.push('Invalid email address') }

    return errors;

  },

  /**
   * Validate `req.query` object provided to API endpoint for searching logs using constraints defined in query
   * @param query Object with query data to be applied on log filter
   */
  logFilter: function (query: LogFilterQuery) {

    let errors = [];

    // Checking for required date(s) variable
    if (!query.datefrom) { errors.push('Missing "from" date') }

    // Checking for required date(s) variable
    if (!query.dateto) { errors.push('Missing "to" date') }

    // Checking for required query variables
    if (!query.status0 || !query.status1) { errors.push('Missing status variable(s)') }

    // Type validation
    let regex = /^\d{4}-\d{2}-\d{2}$/ // Regex for date validation in format `YYYY-MM-DD`
    if (
      typeof query.datefrom !== 'string' ||
      typeof query.dateto !== 'string' ||
      !regex.test(query.datefrom) ||
      !regex.test(query.dateto) ||
      typeof query.status0 !== 'string' ||
      typeof query.status1 !== 'string' ||
      typeof query.watchdogs !== 'string'
    ) {
      errors.push('Invalid type');
    }

    // At least one Watchdog should be selected
    if (query.watchdogs.length === 0) { errors.push('At least one Watchdog should be selected') }

    // At least one status type should be selected
    if (query.status0 === '0' && query.status1 === '0') { errors.push('At least one status type should be selected') }



    // Date conversion: from `YYYY-MM-DD` format to unix epoch time integer (ms)
    const newDateFrom = new Date(query.datefrom);
    const newDateTo = new Date(query.dateto);
    const dateFrom = newDateFrom.getTime();
    const dateTo = newDateTo.getTime();

    // Date comparison validation (`date from` must be less or equal than `date to`)
    if (dateFrom > dateTo) { errors.push('"From" date must be smaller or equal than "To" date') }

    return errors;
  }

}
