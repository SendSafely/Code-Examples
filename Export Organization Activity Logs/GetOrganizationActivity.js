/* START USER DEFINED PARAMETERS */
var ssHost = "https://yourcompany.sendsafely.com";
var ssApiKey = "PUT_YOUR_API_KEY_HERE";
var ssApiSecret = "PUT_YOUR_API_SECRET_HERE";

var fromDate = '3/1/2020';
var toDate = '4/1/2020';

/* END USER DEFINED PARAMETERS */

const sjcl = require("sjcl");
var moment = require('moment');
const requestSync = require('sync-request');

var packageList = {};

getPackages();

const keys = Object.keys(packageList)
console.log("User", "Date", "Package ID", "Package Status", "Recipients", "Files");
for (const key of keys) {
    var currentPackage = packageList[key];
    var user = currentPackage.packageUserName;
    var files = currentPackage.filenames.toString().replace(new RegExp(",", 'g'), ";");
    var recipients = currentPackage.recipients.toString().replace(new RegExp(",", 'g'), ";");
    console.log(user + "," + currentPackage.packageUpdateTimestamp + "," + currentPackage.packageId + "," + currentPackage.packageStateStr + "," + recipients + "," + files);
}

function getPackages() {
    var packageResponse = makeSSRequestSync("POST", "/api/v2.0/package/organization/", "{'fromDate': '" + fromDate + "','filename':'','sender':'','toDate': '" + toDate + "','recipient':'','status':''}");
    //console.log(JSON.parse(packageResponse.getBody('utf8')).packages);
    var packages = JSON.parse(packageResponse.getBody('utf8')).packages;
    //console.log(packages.length);
    for (var i = 0; i < packages.length; i++) {
        var obj = packages[i];
        //console.log(obj.packageId);
        packageList[obj.packageId] = obj;
    }
    var lastDate = moment(packages[packages.length - 1].packageUpdateTimestamp, "MMM D, YYYY h:mm:ss A").subtract(1, 'days').format('MM/DD/YYYY');
    var firstDate = moment(packages[0].packageUpdateTimestamp, "MMM D, YYYY h:mm:ss A").subtract(1, 'days').format('MM/DD/YYYY');
    //console.log(firstDate);
    //console.log(lastDate);
    //console.log(JSON.parse(packageResponse.getBody('utf8')).capped);
    console.log("Got items through " + toDate);
    if (JSON.parse(packageResponse.getBody('utf8')).capped) {
        if (firstDate == lastDate) {
            console.log("ERROR: Results capped within same day");
            return;
        } else {
            toDate = lastDate;
            getPackages();
        }
    }
}

function signMessage(messageString) {
    var hmacFunction = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(ssApiSecret), sjcl.hash.sha256); // Key, Hash
    return sjcl.codec.hex.fromBits(hmacFunction.encrypt(messageString));
}

function makeSSRequestSync(method, url, messageData) {

    var timestamp = new Date().toISOString().substr(0, 19) + "+0000";

    var messageString = ssApiKey + url + timestamp;
    if (messageData != "" && messageData != null) {
        messageString += messageData;
    }
    var signature = signMessage(messageString);
    var requestOptions = {};
    var requestHeaders = {
        'ss-api-key': ssApiKey,
        'ss-request-timestamp': timestamp,
        'ss-request-signature': signature,
        'ss-request-api': 'JS_API',
        'Content-Type': 'application/json'
    };
    requestOptions["headers"] = requestHeaders;
    if (messageData) {
        requestOptions["body"] = messageData;
    }
    var res = requestSync(method, ssHost + url, requestOptions);
    //console.log(res.headers['content-type']);
    if (res.getBody("UTF-8").includes("AUTHENTICATION_FAILED")) {
        throw new Error(res.getBody("UTF-8"));
    } else if (!res.headers['content-type'].includes("application/json")) {
        throw new Error("Incorrect response type. Check your SendSafely hostname");
    } else {
        return res;
    }
}