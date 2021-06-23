var SendSafely = require('@sendsafely/sendsafely');
const Window = require('window');
const window = new Window();
const self = window;
var $ = require("jquery")(window);
const sjcl = require("sjcl");

var ssHost = "https://company_name.sendsafely.com";
var zdHost = "https://company_name.zendesk.com";
var ssApiKey = "PUT_YOUR_SENDSAFELY_API_KEY_HERE";
var ssApiSecret = "PUT_YOUR_SENDSAFELY_API_SECRET_HERE";
var zdUsername = "PUT_YOUR_ZENDESK_USERNAME_HERE";
var zdPassword = "PUT_YOUR_ZENDESK_PASSWORD_HERE";

var sendSafely = new SendSafely(ssHost, ssApiKey, ssApiSecret);
var zendeskMembers = [];
var sendSafelyMembers = [];
var sendSafelyMemberIds = [];
var ssGroupId;

sendSafely.on('sendsafely.error', function(error, errorMsg) {
    console.log(error)
});

var zdRequest = $.ajax({
    url: zdHost + "/api/v2/users.json?role=agent",
    type: "GET",
    timeout: 25000,
    headers: {
        'Authorization': "Basic " + Buffer.from(zdUsername + ":" + zdPassword).toString('base64')
    },
    crossDomain: true,
    async: false,
    retryCount: 2 //Need to Implement.
});

console.log(zdRequest.responseJSON);
var matches = zdRequest.responseJSON.users;
if (matches) {
    for (var i = 0; i < matches.length; i++) {
        zendeskMembers.push(matches[i].email.toLowerCase());
        console.log("Got Zendesk User: " + matches[i].email.toLowerCase());
    }

}

zdRequest = $.ajax({
    url: zdHost + "/api/v2/users.json?role=admin",
    type: "GET",
    timeout: 25000,
    headers: {
        'Authorization': "Basic " + Buffer.from(zdUsername + ":" + zdPassword).toString('base64')
    },
    crossDomain: true,
    async: false,
    retryCount: 2 //Need to Implement.
});
console.log(zdRequest.responseJSON);
var matches = zdRequest.responseJSON.users;
for (var i = 0; i < matches.length; i++) {
    zendeskMembers.push(matches[i].email.toLowerCase());
    console.log("Got Zendesk User: " + matches[i].email.toLowerCase());
}

var groups = makeRequest("GET", "/api/v2.0/user/dropzone-recipients/");
console.log(groups);
var members = groups.responseJSON.recipientEmailAddresses;

for (var j = 0; j < members.length; j++) {
    sendSafelyMembers.push(members[j].toLowerCase());
    console.log("Got SendSafely User: " + members[j].toLowerCase());
}

for (var i = 0; i < sendSafelyMembers.length; i++) {
    if ($.inArray(sendSafelyMembers[i], zendeskMembers) == -1) {
        console.log("REMOVE " + sendSafelyMembers[i]);
        var result = makeRequest("DELETE", "/api/v2.0/user/dropzone-recipients/", JSON.stringify({
            "userEmail": sendSafelyMembers[i]
        }));
        console.log(result);
    }
}

for (var i = 0; i < zendeskMembers.length; i++) {
    if ($.inArray(zendeskMembers[i], sendSafelyMembers) == -1) {
        console.log("ADD " + zendeskMembers[i]);
        var result = makeRequest("PUT", "/api/v2.0/user/dropzone-recipients/", JSON.stringify({
            "userEmail": zendeskMembers[i]
        }));
        console.log(result);
    }
}

function makeRequest(method, url, messageData) {

    var timestamp = new Date().toISOString().substr(0, 19) + "+0000"; //2014-01-14T22:24:00+0000;

    var messageString = ssApiKey + url + timestamp;
    if (messageData != "" && messageData != null) {
        messageString += messageData;
    }
    var signature = signMessage(messageString);

    return $.ajax({
        url: ssHost + url,
        type: method,
        timeout: 25000,
        data: messageData == null ? null : messageData,
        contentType: "application/json",
        headers: {
            'ss-api-key': ssApiKey,
            'ss-request-timestamp': timestamp,
            'ss-request-signature': signature,
            'ss-request-api': 'NODE_API'
        },
        crossDomain: true,
        async: false,
        retryCount: 2 //Need to Implement.
    })
}

function signMessage(messageString) {
    var hmacFunction = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(ssApiSecret), sjcl.hash.sha256); // Key, Hash
    return sjcl.codec.hex.fromBits(hmacFunction.encrypt(messageString));
}