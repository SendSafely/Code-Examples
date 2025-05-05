const SendSafely = require("@sendsafely/sendsafely");
const crypto = require('node:crypto');

const API_KEY = "YOUR_API_KEY", API_SECRET = "YOUR_API_SECRET", BASE_URL = "YOUR_SENDSAFELY_PORTAL_URL";
const PUBLIC_KEY_ID = "YOUR_PUBLIC_KEY_ID";
const PRIVATE_KEY = `YOUR_PRIVATE_KEY_BLOCK`;
const START_TIME = new Date("Jun 24, 2024 15:24:36"); // Example start time
const END_TIME = new Date("Jun 26, 2024 17:25:59"); // Example end time
const RECIPIENT = "YOUR_RECIPIENT_EMAIL" // Email of the recipient (e.g., dropzoneowner@yourcompany.com)

const startDate = `${(START_TIME.getMonth() + 1).toString().padStart(2, '0')}/${START_TIME.getDate().toString().padStart(2, '0')}/${START_TIME.getFullYear()}`;
const endDate = `${(END_TIME.getMonth() + 1).toString().padStart(2, '0')}/${END_TIME.getDate().toString().padStart(2, '0')}/${END_TIME.getFullYear()}`;

function simpleSignature(apiKey, apiSecret, path, body, timestamp) {
    let data = apiKey + path + timestamp + body;
    return crypto.createHmac("sha256", apiSecret).update(data).digest("hex");
}

function requestToSS(path, method = "GET", credentials, config = {}) {
    const {ssHost, ssApiKey, ssApiSecret} = credentials;
    let {body = '', rowIndex, pageSize, params = {}} = config;
    let internalParams = (rowIndex || pageSize) ? {} : null;

    if(body) {
        body = JSON.stringify(body);
    }
    let url = `${ssHost}${path}`;
    let timestamp = `${new Date().toISOString().substr(0, 19)}+0000`;
    let signature = simpleSignature(ssApiKey, ssApiSecret, path, body, timestamp);

    if(params && Object.keys(params).length) {
        internalParams = params;
    }
    if (rowIndex !== undefined && internalParams) {
        internalParams.rowIndex = rowIndex;
    }
    if (pageSize !== undefined && internalParams) {
        internalParams.pageSize = pageSize;
    }
    const headers = {
        'ss-api-key': ssApiKey,
        'ss-request-signature': signature,
        'ss-request-timestamp': timestamp,
        'content-type': 'application/json'
    };
    const options = {
        method,
        headers
    };

    if(internalParams) {
        url = url + '?' + (new URLSearchParams(internalParams)).toString();
    }

    if(body && "GET" !== method) {
        options.body = body;
    }
    return fetch(url, options);
}

const makeIntoPromise = (ssInstance = {}, methodToCall = "") => function (argList = []) {
    return new Promise((resolve, reject) => {
        const ssCallBack = function (sdkResponse) {
            if(sdkResponse?.status && 200 !== sdkResponse.status) {
                reject(sdkResponse);
            }
            resolve(sdkResponse);
        };
        argList.push(ssCallBack);
        ssInstance[methodToCall](...argList);

        ssInstance._promiseRejectCallback = reject;
    }).catch(e => {
        //console.log(`Error during Promisified '${methodToCall}' of SDK: `, e);
        //return {response: "ERROR"};
    });
};

;(async function () {
    try {

        const credentials = {ssHost : BASE_URL, ssApiKey: API_KEY, ssApiSecret: API_SECRET};
        let path = "/api/v2.0/config/verify-credentials/";
        let response = await requestToSS(path, "GET", credentials);
        console.log('Connected as: ', await response.json());

        path = "/api/v2.0/package/organization/search";
        let config = {
            body: {
                "fromDate": startDate,
                "toDate": endDate,
                "recipient": RECIPIENT
            }
        };
        let receivedPackagesRequest = await requestToSS(path, "POST", credentials, config);
        let receivedPackagesResponse = await receivedPackagesRequest.json();

        const SS_INSTANCE = new SendSafely(BASE_URL, API_KEY, API_SECRET);
        // Set and called to reject specific Promises if they fail, from within Promise executor
        SS_INSTANCE._promiseRejectCallback = () => {};
        SS_INSTANCE.on("sendsafely.error", function (code,message) {
            SS_INSTANCE._promiseRejectCallback({code,message});
        });

        let rowIndex = "0";
        config.rowIndex = rowIndex;

        const allReceivedPackages = [];
        while(rowIndex && receivedPackagesResponse?.packages.length) {
            receivedPackagesResponse.packages.forEach(p => allReceivedPackages.push(p));
            rowIndex = receivedPackagesResponse?.pagination?.nextRowIndex;
            config.rowIndex = rowIndex;
            receivedPackagesRequest = await requestToSS(path, "POST", credentials, config);
            receivedPackagesResponse = await receivedPackagesRequest.json();
        }

        // get keycodes
        const getUriKeycode = makeIntoPromise(SS_INSTANCE, "getKeycode");
        let packageKeycode;

        for(let p, i = 0; i < allReceivedPackages.length; i++){
            p = allReceivedPackages[i];
            let updateTimestamp = p.packageUpdateTimestamp;
            let updateTimestampDate = new Date(updateTimestamp);
            // uncomment the line below and add && !packageStatus.includes("Expired") to the if statement on line 130 if you only want Active packages
            // let packageStatus = p.packageStateStr;
            if (updateTimestampDate >= START_TIME && updateTimestampDate <= END_TIME) {
                let issueNumber = p.packageLabel;
                packageKeycode = await getUriKeycode([PRIVATE_KEY, PUBLIC_KEY_ID, p.packageId]);
                if (packageKeycode !== undefined) {
                    let secureLink = `${BASE_URL}/receive/?thread=${p.packageId}&packageCode=${p.packageCode}#keyCode=${packageKeycode}`;
                    console.log("Secure link for package received " + updateTimestamp + " for Issue " + issueNumber + ": " + secureLink);
                }
            }
        }
    } catch (e) {
        console.log("Error: ", e);
    }
})();