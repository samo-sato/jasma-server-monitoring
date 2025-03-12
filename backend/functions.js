var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { generateRandomString, urlBase, widLength, validateEnv } from '../src/utils.js';
import { isNotUnsubscribed, isActivated } from './handleDB.js';
import { toInt } from '../src/utils.js';
// Import React environment variables from `.env` file
import dotenv from 'dotenv';
dotenv.config();
// API endpoint for email activation
// Example link generated with use of this variable: https://www.example.org/api/activation?key=oY8jm5rr8hxqXei
export const activationEndpoint = 'activation';
// Activation link query parameter containing activation key as a value
// Example link generated with use of this variable: https://www.example.org/api/activation?key=oY8jm5rr8G2W7lPhxqXei
export const activationParam = 'key';
// API endpoint for unsubscribing emails
// Example link generated with use of this variable: https://www.example.org/api/unsubscribe?key=lR7CwVv765LkDaxSHk5Z
export const unsubscribeEndpoint = 'unsubscribe';
// Unsubscribe link query parameter containing unsubscribe key as a value
// Example link generated with use of this variable: https://www.example.org/api/unsubscribe?key=lR7CwVv765LkDaxSHk5Z
export const unsubscribeParam = 'key';
// Import environment variables
const REACT_APP_SECURE = validateEnv(process.env.REACT_APP_SECURE, false);
const REACT_APP_PUBLIC_PORT_API = validateEnv(process.env.REACT_APP_PUBLIC_PORT_API, false);
const REACT_APP_PUBLIC_PORT_WEB = validateEnv(process.env.REACT_APP_PUBLIC_PORT_WEB, false);
const REACT_APP_DOMAIN = validateEnv(process.env.REACT_APP_DOMAIN, true);
const REACT_APP_BASE_PATH = validateEnv(process.env.REACT_APP_BASE_PATH, false);
const REACT_APP_SUBDOMAIN = validateEnv(process.env.REACT_APP_SUBDOMAIN, false);
const JASMA_MAIL_HOST = validateEnv(process.env.JASMA_MAIL_HOST, false);
const JASMA_MAIL_PORT = validateEnv(process.env.JASMA_MAIL_PORT, false);
const JASMA_MAIL_SECURE = validateEnv(process.env.JASMA_MAIL_SECURE, false);
const JASMA_MAIL_USER = validateEnv(process.env.JASMA_MAIL_USER, false);
const JASMA_MAIL_PASS = validateEnv(process.env.JASMA_MAIL_PASS, false);
const JASMA_MAIL_DKIM_DOMAIN = validateEnv(process.env.JASMA_MAIL_DKIM_DOMAIN, false);
const JASMA_MAIL_DKIM_SELECTOR = validateEnv(process.env.JASMA_MAIL_DKIM_SELECTOR, false);
const JASMA_MAIL_DKIM_PRIVKEY = validateEnv(process.env.JASMA_MAIL_DKIM_PRIVKEY, false);
const JASMA_MAIL_TLS_REJECT_UNAUTHORIZED = validateEnv(process.env.JASMA_MAIL_TLS_REJECT_UNAUTHORIZED, false);
const JASMA_MAIL_FROM_ADDRESS = validateEnv(process.env.JASMA_MAIL_FROM_ADDRESS, false);
const JASMA_MAIL_FROM_NAME = validateEnv(process.env.JASMA_MAIL_FROM_NAME, false);
// Logger
import winston from 'winston';
export const logger = winston.createLogger({
    format: winston.format.combine(winston.format.timestamp(), winston.format.json(), winston.format.printf((info) => {
        // Explicitly specify the order of properties
        return JSON.stringify({
            timestamp: info.timestamp,
            level: info.level,
            message: info.message,
        }, null, // It specifies how values are stringified
        2 // Space indentation
        );
    })),
    transports: [
        new winston.transports.File({ filename: './backend/logs' }),
        // new winston.transports.Console(), // console.logs logs
    ],
});
let urlBaseEnvs = {
    secure: REACT_APP_SECURE,
    domain: REACT_APP_DOMAIN,
    basePath: REACT_APP_BASE_PATH,
    subdomain: REACT_APP_SUBDOMAIN,
    port: REACT_APP_PUBLIC_PORT_API
};
/**
 * Generate activation key and hyperlink that would be added as footer to every sent email
 * @returns Hyperlink and key for activation
 */
export function generateActivationKeyUrl() {
    const key = generateRandomString(40);
    const url = `${urlBase(urlBaseEnvs, true)}/${activationEndpoint}?${activationParam}=${key}`;
    return {
        key: key,
        url: url
    };
}
/**
 * Generate unsubscribe key and hyperlink that would be added as footer to every sent email
 * @param optionalKey If provided, then key associated hyperlink will be generated (instead of random one)
 * @returns Hyperlink and key for unsubscription
 */
export function generateUnsubscribeKeyUrl(optionalKey) {
    const key = optionalKey ? optionalKey : generateRandomString(40);
    const url = `${urlBase(urlBaseEnvs, true)}/${unsubscribeEndpoint}?${unsubscribeParam}=${key}`;
    return {
        key: key,
        url: url
    };
}
/**
 * Handle and log the provided error
 * Mostly used in `catch` blocks of `try...catch` statements
 * @param error Error to be handled
 * @param generalMsg General message that will appear in front of the specific error message
 * @returns Error code, if not available from `error` object, error code `500` is returned
*/
export function handleError(error, generalMsg) {
    let errMsg;
    let code = 500;
    if (error) {
        if (error instanceof Error) {
            errMsg = error.message;
        }
        else if (typeof error === 'string') {
            errMsg = error;
        }
        else if (error.code && error.data) {
            errMsg = error.data;
            code = error.code;
        }
        else {
            errMsg = `Unknown error: ${error}`;
        }
    }
    else {
        errMsg = 'Some error. And also error handling error.';
    }
    logger.error(`${generalMsg} [${errMsg}]`);
    return code;
}
/**
 * Generate UUID string for new User (used as ID)
 * @returns UUID of new User
 */
export function generateUUID() {
    const bytes = crypto.randomBytes(16);
    // Set version to 4
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    // Set variant to RFC4122
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    // Convert bytes to UUID format
    const hex = bytes.toString('hex');
    const match = hex.match(/(.{8})(.{4})(.{4})(.{4})(.{12})/);
    if (!match) {
        throw new Error("Failed to generate UUID");
    }
    return `${match[1]}-${match[2]}-${match[3]}-${match[4]}-${match[5]}`;
}
/**
 * Take plain text password with salt and make hash from it
 * @param password Plain text password
 * @param salt Salt
 * @returns Hash of salted password
 */
export function saltedPwHash(password, salt) {
    return hash(password + salt);
}
/**
 * Return sha256 hash of given string
 * @param string String to hash
 * @returns Hash
 */
export function hash(string) {
    // Create a hash object
    const hasha256 = crypto.createHash('sha256');
    // Update the hash object with the password
    hasha256.update(string);
    // Get the hashed password as a hexadecimal string
    const hashedString = hasha256.digest('hex');
    return hashedString;
}
/**
 * Return current UTC timestamp in following format: YYYY-MM-DD HH:MM UTC
 * @param customTimestamp Optional unix epoch timestamp (ms) in order to return associated time (optional)
 * @returns UTC timestamp
 */
export function getCurrentDateTimeUTC(customTimestamp) {
    const timestamp = customTimestamp ? customTimestamp : Date.now();
    const dateInUTC = new Date(timestamp);
    const year = dateInUTC.getUTCFullYear();
    const month = String(dateInUTC.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(dateInUTC.getUTCDate()).padStart(2, '0');
    const hours = String(dateInUTC.getUTCHours()).padStart(2, '0');
    const minutes = String(dateInUTC.getUTCMinutes()).padStart(2, '0');
    const formattedDateTimeUTC = `${year}-${month}-${day} ${hours}:${minutes} UTC`;
    return formattedDateTimeUTC;
}
/**
 * Generate random watchdog ID
 * @returns Random watchdog ID
 */
export function generateWatchdogId() {
    return generateRandomString(widLength);
}
/**
 * Create transport options function
 * @returns Transport options
 */
function createTransportOptions() {
    const transportOptions = {};
    // Conditionally add the host if available
    // Server address handling outgoing mails
    if (JASMA_MAIL_HOST) {
        transportOptions.host = JASMA_MAIL_HOST;
    }
    // Conditionally add the port if available and parse it to number
    // Port to which the mail server is configured to listen
    if (JASMA_MAIL_PORT) {
        transportOptions.port = toInt(JASMA_MAIL_PORT);
    }
    // Conditionally set secure based on an environment variable
    // Secure connection can be: true, false, or not set
    if (JASMA_MAIL_SECURE.toLowerCase() === 'true') {
        transportOptions.secure = true;
    }
    if (JASMA_MAIL_SECURE.toLowerCase() === 'false') {
        transportOptions.secure = false;
    }
    // Conditionally add auth only if user and pass are provided
    // Login and password for mail server
    const user = JASMA_MAIL_USER;
    const pass = JASMA_MAIL_PASS;
    if (user && pass) {
        transportOptions.auth = { user, pass };
    }
    // Conditionally add TLS settings if available
    // Do or do not fail on invalid certs
    let rejectUnauthorized = null;
    if (JASMA_MAIL_TLS_REJECT_UNAUTHORIZED.toLowerCase() === 'false') {
        rejectUnauthorized = false;
    }
    if (JASMA_MAIL_TLS_REJECT_UNAUTHORIZED.toLowerCase() === 'true') {
        rejectUnauthorized = true;
    }
    if (rejectUnauthorized !== null) {
        transportOptions.tls = {
            rejectUnauthorized: rejectUnauthorized
        };
    }
    // Conditionally add DKIM settings if available
    // DKIM settings: domain name, key selector, private key for the selector in PEM format
    const dkimD = JASMA_MAIL_DKIM_DOMAIN;
    const dkimS = JASMA_MAIL_DKIM_SELECTOR;
    const dkimP = JASMA_MAIL_DKIM_PRIVKEY;
    if (dkimD || dkimS || dkimP) {
        transportOptions.dkim = {
            domainName: dkimD,
            keySelector: dkimS,
            privateKey: dkimP
        };
    }
    return transportOptions;
}
;
/**
 * Create mail options function
 * @param recipient Email address of recipient
 * @param subject Email subject
 * @param message Email message
 * @returns Mail options
 */
function createMailOptions(recipient, subject, message) {
    const mailOptions = {};
    // Sender's address shown to the recipient
    const fromAddress = JASMA_MAIL_FROM_ADDRESS;
    // Sender's name shown to thr recipient
    const fromName = JASMA_MAIL_FROM_NAME;
    // Conditionally create the `from` object if any address or name is provided
    if (fromAddress || fromName) {
        mailOptions.from = {
            address: fromAddress !== null && fromAddress !== void 0 ? fromAddress : '',
            name: fromName,
        };
    }
    mailOptions.to = recipient;
    mailOptions.subject = subject;
    mailOptions.text = message;
    return mailOptions;
}
/**
 * Send email function
 * @param recipient Email address of recipient
 * @param subject Email subject
 * @param message Email message
 * @param activation Boolean flag: when set to true, it indicates that an activation email is being sent. In this case, the function does not perform a check to verify whether the email is already activated (optional)
 * @returns Promise
 */
export function sendMail(recipient, subject, message, activation) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        try {
            // Check if recipient email address was not unsubscribed and get `unsubKey`
            const unsubKeyResult = yield isNotUnsubscribed(recipient);
            let unsubKey = unsubKeyResult.data;
            // check if email address is activated, in case activation email is NOT being sent (activation !== true)
            if (activation !== true) {
                yield isActivated(recipient);
            }
            // Generate unsubscribe hyperlink based on unsubscribe_key
            const linkToUnsub = generateUnsubscribeKeyUrl(unsubKey).url;
            // Need to change the port
            // urlBaseEnvs.port = REACT_APP_PUBLIC_PORT_WEB;
            const footer = `
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  Why this message?
  We apologize if you did not intend to receive this automated email. It was sent from ${urlBase(urlBaseEnvs, false)} because you (or someone else) once entered your email address into our web app to receive notifications from server monitoring.
  How to unsubscribe:
  To permanently unsubscribe please click on the following link: ${linkToUnsub}
  Thank you for using ${urlBase(urlBaseEnvs, false)} for your server monitoring needs.`;
            // Add footer to the email body
            message = message.concat(footer);
            // try to send the email with prepared settings
            const transporter = nodemailer.createTransport(createTransportOptions());
            yield transporter.sendMail(createMailOptions(recipient, subject, message));
            const msg = `Message sent [${recipient}], subject [${subject}]`;
            logger.info(msg);
            resolve({
                code: 200,
                data: 'Mail sent',
            });
        }
        catch (error) {
            const msg = `Mailing to [${recipient}], with subject [${subject}] has failed`;
            const code = handleError(error, msg);
            reject({
                code: code,
                data: msg
            });
        }
    }));
}
