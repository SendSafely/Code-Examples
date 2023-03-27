//START USER DEFINED VARIABLES
var ssHost = "https://yourcompany.sendsafely.com";
var ssApiKey = "abcdef12345";
var ssApiSecret = "vwxyz67890";

var zdHost = "https://yourcompany.zendesk.com";
var zdAuthToken = "support@yourcompany.com/token:abc123efg456";

var contactGroupId = "";

// keys of packageToTag properties can be either packageID (in URL) or packageCode (in shareable link) of Workspace
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
        var sendSafelyContactGroupMembers = [];
        var sendSafelyContactGroupMemberIds = [];

        var nextPage = zdHost + "/api/v2/search/export.json?filter[type]=user&query=tags:" + packageToTag[key];
        while (nextPage != null) {
            var zdResponse = makeZendeskRequestSync("GET", nextPage);
            if (zdResponse.status == 401) {
                console.log("Zendesk Authentication Error: " + zdResponse.getBody('utf8'));
                return;
            }
            var body = JSON.parse(zdResponse.getBody('utf8'));
            var matches = body.results;
            for (var i = 0; i < matches.length; i++) {
                if (matches[i].active && !matches[i].suspended) {
                    if (matches[i].email) {
                        zendeskMembers.push(matches[i].email.toLowerCase());
                        console.log("Got Zendesk User: " + matches[i].email);
                    } else {
                        console.log("No email for Zendesk User", matches[i]);
                    }
                }
            }
            if (body.meta.has_more) {
                nextPage = body.links.next;
            } else {
                break;
            }
        }

        if (zendeskMembers.length == 0) {
            console.log("Warning: No users found for Zendesk Tag " + packageToTag[key]);
        }
        if (zendeskMembers.length > 1000 && !contactGroupId) {
            console.log("Error: Too many users to add to the workspace. Please specify a contactGroupId");
            process.exit(1);
        }

        var package = makeSSRequestSync("GET", "/api/v2.0/package/" + key + "/");
        var packageBody = JSON.parse(package.getBody('utf8'));
        if (packageBody.response == "UNKNOWN_PACKAGE") {
            console.log("SendSafely Error: " + packageBody.message + " : " + key);
            return;
        }
        var members = packageBody.recipients;
        for (var j = 0; j < members.length; j++) {
            sendSafelyMembers.push(members[j].email.toLowerCase());
            sendSafelyMemberIds.push(members[j].recipientId);
            console.log("Got SendSafely Workspace User: " + members[j].email.toLowerCase());
            if (members[j].roleName == "MANAGER" || members[j].roleName == "OWNER" || members[j].roleName == "CONTRIBUTOR") {
                workspaceManagers.push(members[j].email.toLowerCase());
            }
        }
        if (zendeskMembers.length == 0) {
            console.log("Warning: No users found in Workspace " + key);
        }

        if (contactGroupId) {
            var groupExists = false;
            var groups = makeSSRequestSync("GET", "/api/v2.0/user/groups/").getBody('utf8');
            var groupsJson = JSON.parse(groups).contactGroups;
            for (var i = 0; i < groupsJson.length; i++) {
                if (groupsJson[i].contactGroupId == contactGroupId) {
                    groupExists = true;
                    //console.log(groupsJson[i]);
                    for (var j = 0; j < groupsJson[i].users.length; j++) {
                        sendSafelyContactGroupMembers.push(groupsJson[i].users[j].userEmail.toLowerCase());
                        sendSafelyContactGroupMemberIds.push(groupsJson[i].users[j].userId);
                        console.log("Got SendSafely Contact Group User: " + groupsJson[i].users[j].userEmail.toLowerCase());
                    }
                    break;
                }
            }
            if (!groupExists) {
                console.log("Error: Contact Group " + contactGroupId + " does not exist.");
                process.exit(1);
            }
        }

        if (contactGroupId) {

            //If contact groups are used, delete anyone from the group that is not in Zendesk 
            for (var i = 0; i < sendSafelyContactGroupMembers.length; i++) {
                if (!zendeskMembers.includes(sendSafelyContactGroupMembers[i])) {
                    console.log("REMOVING " + sendSafelyContactGroupMembers[i] + " FROM CONTACT GROUP");
                    makeSSRequestSync("DELETE", "/api/v2.0/group/" + contactGroupId + "/" + sendSafelyContactGroupMemberIds[i] + "/");
                }
            }

	    //If contact groups are used, add anyone from Zendesk that is missing to the group
            for (var i = 0; i < zendeskMembers.length; i++) {
                if (!sendSafelyContactGroupMembers.includes(zendeskMembers[i])) {
                    console.log("ADDING " + zendeskMembers[i] + " TO CONTACT GROUP");
                    makeSSRequestSync("PUT", "/api/v2.0/group/" + contactGroupId + "/user/", "{'userEmail':'" + zendeskMembers[i] + "'}");
                }
            }

        } else {

	    //If contact groups are NOT used, add anyone from Zendesk that is missing to the Workspace
            for (var i = 0; i < zendeskMembers.length; i++) {
                if (!sendSafelyMembers.includes(zendeskMembers[i])) {
                    console.log("ADDING " + zendeskMembers[i] + " TO WORKSPACE");
                    makeSSRequestSync("PUT", "/api/v2.0/package/" + key + "/recipient/", "{'email':'" + zendeskMembers[i] + "'}");
                }
            }
        }

        //Lastly, always check the workspace and delete anyone that is not in Zendesk (unless they are a manager)
        for (var i = 0; i < sendSafelyMembers.length; i++) {
            if (!zendeskMembers.includes(sendSafelyMembers[i]) && !workspaceManagers.includes(sendSafelyMembers[i])) {
                console.log("REMOVING " + sendSafelyMembers[i] + " FROM WORKSPACE");
                makeSSRequestSync("DELETE", "/api/v2.0/package/" + key + "/recipient/" + sendSafelyMemberIds[i]);
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
        'ss-request-api': 'NODE_API',
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