var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./backend/db/service_monitor.db');
import { handleError, logger } from './functions.js';
const serErr = 'Server error'; // Generic error message
/**
 * Check if email is not unsubscribed
 * @param email Email address
 * @returns Resolved promise if email is not unsubscribed, otherwise rejected promise
 */
export function isNotUnsubscribed(email) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        if (email === '') {
            resolve({
                code: 200,
                data: 'ok'
            });
        }
        else {
            // Following query should return `unsubscribe_key` value for given email and...
            // In case the email is unsubscribed: should return `is_unsubscribed` with value `1`
            // in case email is not unsubscribed: should return `is_unsubscribed` with value `0`
            const sql = `
      SELECT
      	(SELECT unsubscribe_key FROM User WHERE email = $email) as unsub_key,
      	(SELECT COUNT(email) FROM Unsubscribed WHERE email = $email) as is_unsubscribed
      ;`;
            const params = { $email: email };
            db.get(sql, params, function (error, row) {
                if (error) {
                    handleError(error, 'Error getting unsubscribed key');
                    reject({
                        code: 500,
                        data: serErr
                    });
                }
                else if (row.is_unsubscribed === 0) {
                    resolve({
                        code: 200,
                        data: row.unsub_key
                    });
                }
                else {
                    const msg = `Email address [${email}] has been evaluated as unsubscribed`;
                    handleError(error, msg);
                    reject({
                        code: 400,
                        data: 'Same email address was unsubscribed, please try different address'
                    });
                }
            });
        }
    }));
}
/**
 * Check if email is activated
 * @param email Email address
 * @returns Resolved promise if email is activated, otherwise rejected promise
 */
export function isActivated(email) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        const sql = `
      SELECT
        email_active
      FROM
        User
      WHERE
        email = $email
      ;`;
        const params = { $email: email };
        db.get(sql, params, function (error, row) {
            if (error) {
                handleError(error, 'Error getting active status');
                reject({
                    code: 500,
                    data: serErr
                });
            }
            else if (!row) {
                const msg = `Status active for email [${email}] not found in DB`;
                logger.error(msg);
                reject({
                    code: 400,
                    data: `New email address "${email}" is not activated`
                });
            }
            else if (row.email_active === 1) {
                resolve({
                    code: 200,
                    data: 'Email is already activated'
                });
            }
            else {
                const msg = `Email address [${email}] has been evaluated as not activated in DB`;
                logger.info(msg);
                reject({
                    code: 400,
                    data: `Email address "${email}" is not activated`
                });
            }
        });
    }));
}
