'use strict';

const _ = require('lodash');
const rr = require('rr');

/**
 * Object returned by `dns.resolve4`
 *
 * @typedef {Object} Address
 * @property {string} address - IPv4 or IPv6 address
 * @property {number} ttl - IP DNS TTL
 */

/**
 * @typedef {Object} ExtendedAddress
 * @augments Address
 * @property {number} expiredTime - milliseconds
 * @property {number} family - IP family
 */

class ResolveTask {
    /**
     * @returns {number}
     */
    static get STATUS_UNRESOLVED() {
        return 0;
    }

    /**
     * @returns {number}
     */
    static get STATUS_RESOLVING() {
        return 1;
    }

    /**
     * @returns {number}
     */
    static get STATUS_RESOLVED() {
        return 2;
    }

    /**
     * @param {number} ipVersion=4,6
     */
    constructor(ipVersion) {
        this._status = ResolveTask.STATUS_UNRESOLVED;
        this._ipVersion = ipVersion;
        this._addresses = [];
        this._resolvedCallbacks = [];
    }

    /**
     * @param {Address[]} addresses
     */
    setAddresses(addresses) {
        this._addresses = this._extendAddresses(addresses);
    }

    /**
     * @returns {ExtendedAddress[]}
     */
    getAddresses() {
        if (this._hasExpiredAddresses()) {
            return [];
        }

        // here _.cloneDeep copies an array
        // and returns clean version without inner fields that were added by rr method call
        // [ 1, 2, 3, _rr: 0 ] -> [ 1, 2, 3 ]
        return _.cloneDeep(this._addresses);
    }

    /**
     * @returns {ExtendedAddress|undefined}
     */
    getNextAddress() {
        if (this._hasExpiredAddresses()) {
            return;
        }

        return rr(this._addresses);
    }

    /**
     * @param {Function} cb
     */
    addAfterResolvedCallback(cb) {
        this._resolvedCallbacks.push(cb);
    }

    /**
     * @returns {[Function]}
     */
    getAfterResolvedCallbacks() {
        return this._resolvedCallbacks;
    }

    clearAfterResolvedCallbacks() {
        this._resolvedCallbacks = [];
    }

    /**
     * @returns {number}
     */
    getStatus() {
        return this._status;
    }

    /**
     * @param {number} status
     */
    setStatus(status) {
        this._status = status;
    }

    /**
     * @param {Address[]} addresses
     * @returns {ExtendedAddress[]}
     * @private
     */
    _extendAddresses(addresses) {
        const extendedAddresses = _.cloneDeep(addresses);

        extendedAddresses.forEach(address => {
            address.expiredTime = Date.now() + address.ttl * 1000;
            address.family = this._ipVersion;
        });

        return extendedAddresses;
    }

    /**
     * @returns {boolean}
     * @private
     */
    _hasExpiredAddresses() {
        const currentTime = Date.now();

        return this._addresses.some(record => record.expiredTime <= currentTime);
    }
}

module.exports = ResolveTask;
