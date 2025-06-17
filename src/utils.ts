// Generic error message related to server issues
export const serErr = 'Server error, try again later';

// Delay margin for gap threshold calculation
// This will be added to REACT_APP_REPEAT_DELAY to account for execution time and slight delays inside different functions
export const delayMargin = 0.05;
export function delayWithMargin(delay: number): number {
  return delay + Math.floor(delay * delayMargin);
}

// Autorefresh timing vairables
export const refreshDelayShort = 1000; // Milliseconds - used in setInterval
export const refreshDelayLong = 15000; // Milliseconds - used in setInterval
export const autorefreshNote = 'Data on this page are updated automatically';

// Variables used in different url generating functionality
export const widLength = 30;
export const apiPathName = 'api';
export const restrictedPath = 'private';
export const snoozePath = 'snooze';

export interface GenericPromiseReturn {
  code: number;
  data: any;
}

export enum BinaryState {
  NO = 0,
  YES = 1
}

export interface WatchdogData {
  adding: BinaryState;
  name: string;
  url: string;
  id?: string | null;
  enabled: BinaryState;
  email_notif: BinaryState;
  passive?: BinaryState;
  threshold: number;
}

export interface Settings {
  email?: string;
  activationKey?: string;
  unsubscribeKey?: string;
}

/**
 * Convert string to valid number
 * @param value Input string (usually value from environment variable, eg. `123` as a string)
 * @returns Valid number
 */
export function toInt(value: string): number {
  const result = parseInt(value, 10);
  if (isNaN(result)) {
    throw new Error(`Failed to convert value "${value}" to valid number`);
  }
  return result;
}

/**
 * Check, if given environment variable is undefined OR empty AND mandatory
 * @param envVar Environment variable
 * @param isMandatory Boolean flag of mandatory variable
 * @returns Environment variable value, throw error otherwise
 */
export function validateEnv(envVar: any | undefined, isMandatory: boolean): string {
  
  let errMsg: string = '';

  if (typeof envVar === 'undefined') {
    errMsg = `Undefined environment variable`;
  }
  
  if (isMandatory && envVar === '') {
    errMsg = `Mandatory environment variable is empty`;
  }

  if (errMsg) {
    throw new Error(errMsg);
  } else {
    return envVar;
  }

}

/**
 * Convert number of milliseconds to human readable time length (eg. 5421 => `5 seconds`)
 * @param ms Time in milliseconds
 * @returns Human readable time length description
 */
export function msToWords(ms: number): string {

  let unit: string;
  let divider: number = 1;

  if (ms >= 0           && ms < 59000      ) { unit = 'second' ; divider = 1000*1} else if
     (ms >= 59000       && ms < 3540000    ) { unit = 'minute' ; divider = 1000*60} else if
     (ms >= 3540000     && ms < 82800000   ) { unit = 'hour'   ; divider = 1000*60*60} else if
     (ms >= 82800000    && ms < Infinity   ) { unit = 'day'    ; divider = 1000*60*60*24}
  else {
    unit = 'N/A';
  }

  const number: number = Math.round(ms / divider);
  const s: string = number === 0 || number > 1 ? 's' : '';
  return ` ${number} ${unit}${s}`;

}

/**
 * Generate random string
 * @param length Output string length
 * @returns Random string in given `length`
 */
export function generateRandomString(length: number): string {

  // Set of characters used to generate random strings
  const characters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  let result: string = '';

  for (let i: number = 0; i < length; i++) {
    const randomIndex: number = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}

/**
 * Return URL base with optional port number, base path and API path sourced from environment variables
 * Port number, base path and API path must not be an empty string in order to be included in returned url
 * Examples of returned value:
 * "https://www.example.com"               will be returned if urlBaseEnvs.domain="example.com"; envPort="";     urlBaseEnvs.basePath="";     api=false
 * "https://www.example.com:3001/shop/api" will be returned if urlBaseEnvs.domain="example.com"; envPort="3001"; urlBaseEnvs.basePath="shop"; api=true 
 * @param envPort Port number used in output URL (use empty string to ignore port number)
 * @param api Whether output URL leads to API resource (true) or web frontend resource (false)
 * @returns URL base
*/

interface UrlBaseEnvs {
  secure: string,
  domain: string,
  basePath: string,
  subdomain: string,
  port: string
}

export function urlBase(urlBaseEnvs: UrlBaseEnvs, api: boolean):string {

  const protocol = urlBaseEnvs.secure.toLowerCase() === 'true' ? 'https://' : 'http://'; // Protocol used in url (http or https)
  const subDomain = urlBaseEnvs.subdomain ? `${urlBaseEnvs.subdomain}.` : ''; // If set, include subdomain in url, example for `www`: `https://www.example.org`
  const domain = urlBaseEnvs.domain;
  if (!domain || domain === '') {
    const msg: string = 'Invalid domain url, check environment variables';
    throw new Error(msg);
  }

  // Add semicolon, in case port is not empty string
  const port: string = urlBaseEnvs.port && `:${urlBaseEnvs.port}`;

  // Add forward slash, in case base path is not empty string
  const basePath: string = urlBaseEnvs.basePath && `/${urlBaseEnvs.basePath}`;

  // Add api path, in case api parameter is set to true
  let apiPath: string = api === true ? apiPathName : '';

  // Add forward slash to apiPath, in case apiPath is not empty string
  apiPath = apiPath && `/${apiPath}`;
  return `${protocol}${subDomain}${domain}${port}${basePath}${apiPath}`;

}