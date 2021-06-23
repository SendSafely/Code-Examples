const requestSync = require('sync-request');
const requestAsync = require('request');
const sjcl = require("sjcl");

//Start of configuration section 
//Edit the following variables to use values that are specific to your Okta and SendSafely instances 
var ssHost = "https://COMPANY_NAME.sendsafely.com"; // The URL that you use to access the SendSafely Portal 
var oktaHost = "https://COMPANY_NAME.okta.com"; // The URL you use to access your Okta Portal 
var ssApiKey = "YOUR_SENDSAFELY_API_KEY"; // API Key belonging to the Dropzone Owner for the Dropzone you want to sync 
var ssApiSecret = "YOUR_SENDSAFELY_API_SECRET"; // API Secret for the API Key included above 
var oktaApiToken = "YOUR_OKTA_API_TOKEN"; // Okta API Token for API Access - https://developer.okta.com/docs/guides/create-an-api-token/overview/
var oktaGroupId = "YOUR_OKTA_GROUP_ID"; // Okta group id for the group you want to sync. This is a unique alphanumeric value visible in the Okta Admin portal URL when viewing the group (ie. /admin/group/{group id})
//End of configuration section 

var oktaMembers = [];
var sendSafelyMembers = [];
var sendSafelyMemberIds = [];
var ssGroupId;

var oktaUserListUrl = oktaHost + '/api/v1/groups/' + oktaGroupId + '/users';
var hasMoreOktaUsers = true;
while (hasMoreOktaUsers) {
    var oktaUserListResponse = makeOktaRequestSync("GET", oktaUserListUrl);
    var users = JSON.parse(oktaUserListResponse.getBody('utf8'));

    for (var i = 0; i < users.length; i++) {
        console.log(users[i].status);
        if (users[i].status.toUpperCase() != "DEPROVISIONED") {
            oktaMembers.push(users[i].profile.email.toLowerCase());
            console.log("Got Okta User: " + users[i].profile.email.toLowerCase());
        }

    }
    if (oktaUserListResponse.headers['link'] !== undefined && parseLinkHeader(oktaUserListResponse.headers['link'])['next'] !== undefined) {
        oktaUserListUrl = parseLinkHeader(oktaUserListResponse.headers['link'])['next']['href'];
    } else {
        hasMoreOktaUsers = false;
    }

}

var groups = makeSSRequestSync("GET", "/api/v2.0/user/dropzone-recipients/");
var members = JSON.parse(groups.getBody('utf8')).recipientEmailAddresses;

for (var j = 0; j < members.length; j++) {
    sendSafelyMembers.push(members[j].toLowerCase());
    console.log("Got SendSafely User: " + members[j].toLowerCase());
}

for (var i = 0; i < sendSafelyMembers.length; i++) {
    if (!oktaMembers.includes(sendSafelyMembers[i])) {
        console.log("REMOVE " + sendSafelyMembers[i]);
        var result = makeSSRequestAsync("DELETE", "/api/v2.0/user/dropzone-recipients/", JSON.stringify({
            "userEmail": sendSafelyMembers[i]
        }));
        //console.log(JSON.parse(result.getBody('utf8')). response);
    }
}

for (var i = 0; i < oktaMembers.length; i++) {
    if (!sendSafelyMembers.includes(oktaMembers[i])) {
        console.log("ADD " + oktaMembers[i]);
        var result = makeSSRequestSync("PUT", "/api/v2.0/user/dropzone-recipients/", JSON.stringify({
            "userEmail": oktaMembers[i]
        }));
        console.log(JSON.parse(result.getBody('utf8')).response);
    }
}

function makeOktaRequestSync(method, url) {

    var requestOptions = {};
    var requestHeaders = {
        'Authorization': 'SSWS ' + oktaApiToken,
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
        'ss-request-api': 'NODE_API',
        'Content-Type': 'application/json'
    };
    requestOptions["headers"] = requestHeaders;
    if (messageData) {
        requestOptions["body"] = messageData;
    }
    var res = requestSync(method, ssHost + url, requestOptions);
    console.log(res.headers['content-type']);
    if (res.getBody("UTF-8").includes("AUTHENTICATION_FAILED")) {
        throw new Error(res.getBody("UTF-8"));
    } else if (!res.headers['content-type'].includes("application/json")) {
        throw new Error("Incorrect response type. Check your SendSafely hostname");
    } else {
        return res;
    }
}


function makeSSRequestAsync(method, url, messageData) {

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
        'ss-request-api': 'NODE_API',
        'Content-Type': 'application/json'
    };
    requestOptions["headers"] = requestHeaders;
    requestOptions["url"] = ssHost + url;
    requestOptions["method"] = method;

    if (messageData) {
        requestOptions["body"] = messageData;
    }
    requestAsync(requestOptions);
}

function signMessage(messageString) {
    var hmacFunction = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(ssApiSecret), sjcl.hash.sha256); // Key, Hash
    return sjcl.codec.hex.fromBits(hmacFunction.encrypt(messageString));
}

function parseLinkHeader(header) {
    var linkexp = /<[^>]*>\s*(\s*;\s*[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g;
    var paramexp = /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g;
    var matches = header.match(linkexp);
    var rels = new Object();
    for (i = 0; i < matches.length; i++) {
        var split = matches[i].split('>');
        var href = split[0].substring(1);
        var ps = split[1];
        var link = new Object();
        link.href = href;
        var s = ps.match(paramexp);
        for (j = 0; j < s.length; j++) {
            var p = s[j];
            var paramsplit = p.split('=');
            var name = paramsplit[0];
            link[name] = unquote(paramsplit[1]);
        }
        if (link.rel != undefined) {
            rels[link.rel] = link;
        }
    }
    return rels;
}


function unquote(value) {
    if (value.charAt(0) == '"' && value.charAt(value.length - 1) == '"') return value.substring(1, value.length - 1);
    return value;
}