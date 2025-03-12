// This file handles all client-side API requests / responses
import { urlBase, restrictedPath, validateEnv } from './utils.js';
// Validating environment variables
const REACT_APP_SECURE = validateEnv(process.env.REACT_APP_SECURE, false);
const REACT_APP_DOMAIN = validateEnv(process.env.REACT_APP_DOMAIN, true);
const REACT_APP_BASE_PATH = validateEnv(process.env.REACT_APP_BASE_PATH, false);
const REACT_APP_SUBDOMAIN = validateEnv(process.env.REACT_APP_SUBDOMAIN, false);
const REACT_APP_PUBLIC_PORT_API = validateEnv(process.env.REACT_APP_PUBLIC_PORT_API, false);
let urlBaseEnvs = {
    secure: REACT_APP_SECURE,
    domain: REACT_APP_DOMAIN,
    basePath: REACT_APP_BASE_PATH,
    subdomain: REACT_APP_SUBDOMAIN,
    port: REACT_APP_PUBLIC_PORT_API
};
// Set base URL of public API server
const baseUrl = urlBase(urlBaseEnvs, true);
// Generic unspecified server error message
const serErr = 'Server error';
// Function handling returned status code of fetch call
function handleStatusCode(code) {
    if (code === 429) {
        console.log(`Status code ${code} detected`);
        window.alert('Too many requests, please return back later');
        throw new Error('Too many requests');
    }
}
// Generic part of fetch() `options` argument
let options = {
    credentials: 'include',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
};
// Checking authentication
export function isAuthenticated() {
    const resource = `${baseUrl}/${restrictedPath}/authenticate`;
    return fetch(resource, options)
        .then(response => {
        handleStatusCode(response.status);
        return response.json();
    })
        .catch(error => {
        console.log(error);
    });
}
// Create new account
export function register(answer) {
    const resource = `${baseUrl}/register?answer=${answer}`;
    return fetch(resource, options)
        .then(response => {
        handleStatusCode(response.status);
        return response.json() // Returning promise that resolves to JSON object
            .then(jsonResponse => {
            return new Promise((resolve, reject) => {
                resolve({
                    authenticated: response.ok,
                    message: jsonResponse.message,
                    uuid: jsonResponse.uuid,
                    password: jsonResponse.password,
                    time: jsonResponse.time
                });
            });
        });
    })
        .catch(error => {
        return new Promise((resolve, reject) => {
            reject({
                authenticated: false,
                message: serErr
            });
        });
    });
}
// User login
export function login(password) {
    const resource = `${baseUrl}/login`;
    const body = JSON.stringify({
        password: password
    });
    const opt = Object.assign(Object.assign({}, options), { method: 'POST', body: body });
    return fetch(resource, opt)
        .then(response => {
        handleStatusCode(response.status);
        return response.json() // Returning promise that resolves to JSON object
            .then(jsonResponse => {
            return new Promise((resolve, reject) => {
                resolve({
                    authenticated: response.ok,
                    uuid: jsonResponse.uuid,
                    message: jsonResponse.message,
                    time: jsonResponse.time
                });
            });
        });
    })
        .catch(error => {
        return new Promise((resolve, reject) => {
            reject(error);
        });
    });
}
// user logout
export function logout() {
    const resource = `${baseUrl}/${restrictedPath}/logout`;
    const opt = Object.assign(Object.assign({}, options), { method: 'POST' });
    return fetch(resource, opt)
        .then(response => {
        handleStatusCode(response.status);
        if (response.ok) {
            return response.json();
        }
        else {
            return new Promise((resolve, reject) => {
                response.json()
                    .then(error => {
                    ;
                    reject(error.data);
                })
                    .catch(error => {
                    reject(error.data);
                });
            });
        }
    })
        .catch(error => {
        return new Promise((resolve, reject) => {
            reject(error);
        });
    });
}
// fetch `Watchdog` items
export function getWatchdogs() {
    const resource = `${baseUrl}/${restrictedPath}/watchdogs`;
    return fetch(resource, options)
        .then(response => {
        handleStatusCode(response.status);
        if (response.ok) {
            return response.json();
        }
        else {
            return new Promise((resolve, reject) => {
                response.json()
                    .then(error => {
                    reject(error.data);
                })
                    .catch(error => {
                    reject(error.data);
                });
            });
        }
    })
        .catch(error => {
        return new Promise((resolve, reject) => {
            reject(error);
        });
    });
}
// Fetch single `Watchdog` item
export function getWatchdog(id) {
    const resource = `${baseUrl}/${restrictedPath}/watchdogs/${id}`;
    return fetch(resource, options)
        .then(response => {
        handleStatusCode(response.status);
        if (response.ok) {
            return response.json();
        }
        else {
            return new Promise((resolve, reject) => {
                response.json()
                    .then(error => {
                    reject(error.data);
                })
                    .catch(error => {
                    reject(error.data);
                });
            });
        }
    })
        .catch(error => {
        return new Promise((resolve, reject) => {
            reject(error);
        });
    });
}
// Update `Watchdog` item
export function updateWatchdog(id, watchdogData) {
    const resource = `${baseUrl}/${restrictedPath}/watchdogs/${id}`;
    const opt = Object.assign(Object.assign({}, options), { method: 'PUT', body: JSON.stringify(watchdogData) });
    return fetch(resource, opt)
        .then(response => {
        handleStatusCode(response.status);
        if (response.ok) {
            return response.json();
        }
        else {
            return new Promise((resolve, reject) => {
                response.json()
                    .then(error => {
                    reject(error.data);
                })
                    .catch(error => {
                    reject(error.data);
                });
            });
        }
    })
        .catch(error => {
        return new Promise((resolve, reject) => {
            reject(error);
        });
    });
}
// Delete `Watchdog` item
export function deleteWatchdog(id) {
    const resource = `${baseUrl}/${restrictedPath}/watchdogs/${id}`;
    const opt = Object.assign(Object.assign({}, options), { method: 'DELETE' });
    return fetch(resource, opt)
        .then(response => {
        handleStatusCode(response.status);
        return new Promise((resolve, reject) => {
            if (response.status === 204) {
                resolve('Watchdog deleted successfully');
            }
            else {
                reject(serErr);
            }
        });
    })
        .catch(error => {
        return new Promise((resolve, reject) => {
            reject(error);
        });
    });
}
// Add `Watchdog` item
export function addWatchdog(watchdogData) {
    const resource = `${baseUrl}/${restrictedPath}/watchdogs`;
    const opt = Object.assign(Object.assign({}, options), { method: 'POST', body: JSON.stringify(watchdogData) });
    return fetch(resource, opt)
        .then(response => {
        handleStatusCode(response.status);
        if (response.ok) {
            return response.json();
        }
        else {
            return new Promise((resolve, reject) => {
                response.json()
                    .then(error => {
                    reject(error.data);
                })
                    .catch(error => {
                    reject(error.data);
                });
            });
        }
    })
        .catch(error => {
        return new Promise((resolve, reject) => {
            reject(error);
        });
    });
}
// Fetch basic stats (for home page) from API server
export function getStats() {
    const resource = `${baseUrl}/${restrictedPath}/stats`;
    return fetch(resource, options)
        .then(response => {
        handleStatusCode(response.status);
        if (response.ok) {
            return response.json();
        }
        else {
            return new Promise((resolve, reject) => {
                response.json()
                    .then(error => {
                    reject(error.data);
                })
                    .catch(error => {
                    reject(error.data);
                });
            });
        }
    })
        .catch(error => {
        return new Promise((resolve, reject) => {
            reject(error);
        });
    });
}
// Get users's settings
export function getSettings() {
    const resource = `${baseUrl}/${restrictedPath}/settings`;
    return fetch(resource, options)
        .then(response => {
        handleStatusCode(response.status);
        if (response.ok) {
            return response.json();
        }
        else {
            return new Promise((resolve, reject) => {
                response.json()
                    .then(error => {
                    reject(error.data);
                })
                    .catch(error => {
                    reject(error.data);
                });
            });
        }
    })
        .catch(error => {
        return new Promise((resolve, reject) => {
            reject(error);
        });
    });
}
// Update user's settings
export function updateSettings(settings) {
    const resource = `${baseUrl}/${restrictedPath}/settings`;
    const opt = Object.assign(Object.assign({}, options), { method: 'PUT', body: JSON.stringify(settings) });
    return fetch(resource, opt)
        .then(response => {
        handleStatusCode(response.status);
        if (response.ok) {
            return response.json();
        }
        else {
            return new Promise((resolve, reject) => {
                response.json()
                    .then(error => {
                    reject(error.data);
                })
                    .catch(error => {
                    reject(error.data);
                });
            });
        }
    })
        .catch(error => {
        return new Promise((resolve, reject) => {
            reject(error);
        });
    });
}
// Get app's self logs
export function getSelfLogs() {
    const resource = `${baseUrl}/${restrictedPath}/selflogs`;
    return fetch(resource, options)
        .then(response => {
        handleStatusCode(response.status);
        if (response.ok) {
            return response.json();
        }
        else {
            return new Promise((resolve, reject) => {
                response.json()
                    .then(error => {
                    reject(error.data);
                })
                    .catch(error => {
                    reject(error.data);
                });
            });
        }
    })
        .catch(error => {
        return new Promise((resolve, reject) => {
            reject(error);
        });
    });
}
// Get app's logs
export function getLogs(queryString) {
    const resource = `${baseUrl}/${restrictedPath}/logs${queryString}`;
    return fetch(resource, options)
        .then(response => {
        handleStatusCode(response.status);
        if (response.ok) {
            return response.json();
        }
        else {
            return new Promise((resolve, reject) => {
                response.json()
                    .then(error => {
                    reject(error.data);
                })
                    .catch(error => {
                    reject();
                });
            });
        }
    })
        .catch(error => {
        return new Promise((resolve, reject) => {
            reject(error);
        });
    });
}
