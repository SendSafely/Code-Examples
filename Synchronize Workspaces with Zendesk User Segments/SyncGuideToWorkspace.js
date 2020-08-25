//START USER DEFINED VARIABLES
var ssHost = "https://yourcompany.sendsafely.com";
var ssApiKey = "abcdef12345";
var ssApiSecret = "vwxyz67890";

var zdHost = "https://yourcompany.zendesk.com";
var zdAuthToken = "support@yourcompany.com/token:abc123efg456";

var packageToTag = {
    "AAAA-1111": "product-1-tag",
    "BBBB-2222": "product-2-tag",
    "CCCC-3333": "product-3-tag"
};

//END USER DEFINED VARIABLES

const requestSync = require('sync-request');
const sjcl = require("sjcl");

try {

    for (var key in packageToTag) {
        //console.log("Package ID " + key + " will be assigned users with tag " + packageToTag[key]);
        var workspaceManagers = [];
        var zendeskMembers = [];
        var sendSafelyMembers = [];
        var sendSafelyMemberIds = [];

        var nextPage = zdHost + "/api/v2/search.json?query=type:user%20tags:" + packageToTag[key];
        while (nextPage != null) {
            var zdResponse = makeZendeskRequestSync("GET", nextPage);
            if (zdResponse.status == 401) {
                console.log("Zendesk Authentication Error: " + zdResponse.getBody('utf8'));
                return;
            }
            var matches = JSON.parse(zdResponse.getBody('utf8')).results;
            for (var i = 0; i < matches.length; i++) {
                if (matches[i].active && !matches[i].suspended) {
                    zendeskMembers.push(matches[i].email.toLowerCase());
                    console.log("Got Zendesk User: " + matches[i].email);
                }
            }
            nextPage = JSON.parse(zdResponse.getBody('utf8')).next_page;
        }

        if (zendeskMembers.length == 0) {
            console.log("Warning: No users found for Zendesk Tag " + packageToTag[key]);
        }

        var package = makeSSRequestSync("GET", "/api/v2.0/package/" + key + "/");
        if (JSON.parse(package.getBody('utf8')).response == "UNKNOWN_PACKAGE") {
            console.log("SendSafely Error: " + JSON.parse(package.getBody('utf8')).message + " : " + key);
            return;
        }

        var members = JSON.parse(package.getBody('utf8')).recipients;
        for (var j = 0; j < members.length; j++) {
            sendSafelyMembers.push(members[j].email.toLowerCase());
            sendSafelyMemberIds.push(members[j].recipientId);
            console.log("Got SendSafely User: " + members[j].email.toLowerCase());
            if (members[j].roleName == "MANAGER" || members[j].roleName == "OWNER" || members[j].roleName == "CONTRIBUTOR") {
                workspaceManagers.push(members[j].email.toLowerCase());
            }
        }
        if (zendeskMembers.length == 0) {
            console.log("Warning: No users found in Workspace " + key);
        }

        for (var i = 0; i < sendSafelyMembers.length; i++) {
            if (!zendeskMembers.includes(sendSafelyMembers[i]) && !workspaceManagers.includes(sendSafelyMembers[i])) {
                console.log("REMOVE " + sendSafelyMembers[i]);
                makeSSRequestSync("DELETE", "/api/v2.0/package/" + key + "/recipient/" + sendSafelyMemberIds[i]);
            }
        }

        for (var i = 0; i < zendeskMembers.length; i++) {
            if (!sendSafelyMembers.includes(zendeskMembers[i])) {
                console.log("ADD " + zendeskMembers[i]);
                makeSSRequestSync("PUT", "/api/v2.0/package/" + key + "/recipient/", "{'email':'" + zendeskMembers[i] + "'}");
            }
        }
    }
} catch (err) {
    console.log(err.message);
    //throw err;
}

function makeZendeskRequestSync(method, url) {

    var zdAuthHeader = "Basic " + Buffer.from(zdAuthToken).toString('base64');
    var requestOptions = {};
    var requestHeaders = {
        'Authorization': zdAuthHeader
    };
    requestOptions["headers"] = requestHeaders;
    var res = requestSync(method, url, requestOptions);
    return res;
}


function makeSSRequestSync(method, url, messageData) {

    var timestamp = new Date().toISOString().substr(0, 19) + "+0000"; //2014-01-14T22:24:00+0000;

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

    if (res.getBody("UTF-8").includes("AUTHENTICATION_FAILED")) {
        throw new Error(res.getBody("UTF-8"));
    } else if (!res.headers['content-type'].includes("application/json")) {
        throw new Error("Incorrect response type. Check your SendSafely hostname");
    } else {
        return res;
    }
}

function signMessage(messageString) {
    var hmacFunction = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(ssApiSecret), sjcl.hash.sha256); // Key, Hash
    return sjcl.codec.hex.fromBits(hmacFunction.encrypt(messageString));
}