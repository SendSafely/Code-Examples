const fetch = require('make-fetch-happen');
const sjcl = require("sjcl");

const _calculateSignature = function(data, apiKeySecret) {
    if(!apiKeySecret) {
        throw new Error('_calculateSignature: apiKeySecret is not defined');
    }
    const hmacFunction = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(apiKeySecret), sjcl.hash.sha256);// Key, Hash
    return sjcl.codec.hex.fromBits(hmacFunction.encrypt(data));
};

const _getTimeStamp = function() {
    return new Date().toISOString().substring(0, 19) + "+0000"; //2014-01-14T22:24:00+0000;
};

const sendRequest = function (url, options) {
    return fetch(url, options);
};

const sendSignedRequest = async function sendsafelyThen(params = {}) {
    if(typeof params !== 'object') {
        throw new Error('sendSignedRequest: Invalid argument passed to function');
    }
    if(!params.hasOwnProperty('creds')) {
        throw new Error('sendSignedRequest: creds (API key and API secret) are missing');
    }
    if(!params.hasOwnProperty('host')) {
        throw new Error('sendSignedRequest: host URL is missing');
    }
    if(!params.hasOwnProperty('method')) {
        throw new Error('sendSignedRequest: HTTP method is missing');
    }
    if(!params.hasOwnProperty('path')) {
        throw new Error('sendSignedRequest: URL path is missing');
    }
    const {creds, host, method, mimetype, path} = params;
    const fullURL = host + path;
    let {body} = params;
    let timestamp = _getTimeStamp();

    if (body === undefined) {
        body = '';
    }

    const data = creds.apiKey + path + timestamp + body;
    const signature = _calculateSignature(data, creds.apiSecret);

    const headers = {
        'ss-api-key': creds.apiKey,
        'ss-request-timestamp': timestamp,
        'ss-request-signature': signature,
    };

    let options = {
        headers,
        method
    };

    if (body && "GET" !== method) {
        options.body = body;
        headers['content-type'] = 'application/json';
        if(mimetype && mimetype.includes('multipart/form-data')) {
            headers['content-type'] = 'multipart/form-data';
            options.headers['content-length'] = Buffer.from(options.body).length;
        }
    }

    return await fetch(fullURL, options)
        .catch(console.warn);
}


module.exports = {sendRequest, sendSignedRequest};