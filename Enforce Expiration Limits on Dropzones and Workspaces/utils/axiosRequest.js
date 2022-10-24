const axios = require('axios');
const sjcl = require('sjcl');


function calculateSignature(apiKey, apiSecret, path, body, timestamp) {
    let data = apiKey + path + timestamp + body;

    let hmacFunction = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(apiSecret), sjcl.hash.sha256); // Key, Hash
    return sjcl.codec.hex.fromBits(hmacFunction.encrypt(data));
}

function sendsafelyThen(credentials, method, path, config = {}) {
    const {ssHost, ssApiKey, ssApiSecret} = credentials;
    let {body = '""', rowIndex, pageSize, params = {}} = config;
    let internalParams = {};
    /**
     $ package/dir call FAILS with contaminated params object.
     Assume if params passed, then not using rowIndex or pagesize, since
     $ org/search is tolerant to extraneous param object properties
     */
    if(params) {
        internalParams = params;
    }
    if (rowIndex !== undefined) {
        internalParams.rowIndex = rowIndex;
    }
    if (pageSize !== undefined) {
        internalParams.pageSize = pageSize;
    }

    if (body === undefined) {
        body = "";
    }
    if (body === "") {
        body = '""';
    }

    let url = `${ssHost}${path}`
    let timestamp = `${new Date().toISOString().substr(0, 19)}+0000`;
    let signature = calculateSignature(ssApiKey, ssApiSecret, path, body, timestamp);

    return axios({
        method: method,
        url: url,
        params: internalParams,
        headers: {
            'ss-api-key': ssApiKey,
            'ss-request-signature': signature,
            'ss-request-timestamp': timestamp,
            'content-type': 'application/json'
        },
        data: body
    });
}

module.exports = sendsafelyThen;