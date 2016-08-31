import es6Promise from 'es6-promise'; es6Promise.polyfill();
import fetch from 'isomorphic-fetch';
import jwt from 'jsonwebtoken';
import UrlUtils from './urlconfig';
import { FetchFunctions } from './fetch';
import { jwk2pem } from 'pem-jwk';
let storedToken = null;
let publicKeyStore = null;
let tokenFetchPromise = null;
export default {
    /**
     * Fetches the JWT token. This token is cached for a default of 25mins.
     * If it is within 5mins or expiry it will fetch a new one.
     */
    fetchJWT() {
        if (storedToken && storedToken.exp) {
            const diff = storedToken.exp - Math.trunc(new Date().getTime() / 1000);
            if (diff < 300) {
                tokenFetchPromise = null;
            }
        }

        if (!tokenFetchPromise) {
            tokenFetchPromise = fetch(`${UrlUtils.getJenkinsRootURL()}/jwt-auth/token`, { credentials: 'same-origin' })
                .then(this.checkStatus)
                .then(response => {
                    const token = response.headers.get('X-BLUEOCEAN-JWT');
                    if (token) {
                        return token;
                    }
                    
                    throw new Error('Could not fetch jwt_token');
                });
        }

        return tokenFetchPromise;
    },

    /**
     * Verifies the token using the public key.
     */
    verifyToken(token, certObject) {
        return new Promise((resolve, reject) =>
            // Allow the clocks to be 60s out of sync.
            jwt.verify(token, jwk2pem(certObject), { algorithms: [certObject.alg], clockTolerance: 60 }, (err, payload) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(payload);
                }
            }));
    },

    /**
     * Fetches the public key that is used to verify tokens.
     */
    fetchJWTPublicKey(token) {
        const decoded = jwt.decode(token, { complete: true });
        const url = `${UrlUtils.getJenkinsRootURL()}/jwt-auth/jwks/${decoded.header.kid}/`;
        if (!publicKeyStore) {
            publicKeyStore = fetch(url, { credentials: 'same-origin' })
                .then(FetchFunctions.checkStatus)
                .then(FetchFunctions.parseJSON)
                .then(cert => this.verifyToken(token, cert)
                    .then(payload => ({
                        token,
                        payload,
                    })));
        }

        return publicKeyStore;
    },

    /**
     * Puts the token into global storage for later use.
     */
    storeToken(data) {
        storedToken = data.payload;
        return data;
    },

    /**
     * Use this function if you want the payload from the token.
     */
    getTokenWithPayload() {
        return this.fetchJWT()
            .then(FetchFunctions.checkStatus)
            .then(token => this.fetchJWTPublicKey(token))
            .then(data => this.storeToken(data));
    },

    /**
     * Gets the token from te server and verifies it.
     */
    getToken() {
        return this.getTokenWithPayload().then(token => token.token);
    },
};
