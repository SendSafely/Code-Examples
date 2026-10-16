// noinspection JSAssignmentUsedAsCondition
const fetch = require('make-fetch-happen');
const sjcl = require('sjcl');

//Start of configuration section
//Edit the following variables to use values that are specific to your Okta and SendSafely instances
const ssHost = ""; // The URL that you use to access the SendSafely Portal
const oktaHost = ""; // The URL you use to access your Okta Portal
const ssApiKey = ""; // API Key belonging to the Dropzone Owner for the Dropzone you want to sync
const ssApiSecret = ""; // API Secret for the API Key included above
const ssContactGroupId = ""; // only available from API query
const oktaApiToken = ""; // Okta API Token for API Access (must be generated AFTER being added to Group) - https://developer.okta.com/docs/guides/create-an-api-token/overview/
const oktaGroupId = ""; // Okta group id for the group you want to sync. This is a unique alphanumeric value visible in the Okta Admin portal URL when viewing the group (ie. /admin/group/{group id})
//End of configuration section

const oktaMembers = [];
const sendSafelyMembersEmails = [];

const dryRun = true; // dry run

const calculateSignature = function (data) {
    const hmacFunction = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(ssApiSecret), sjcl.hash.sha256); // Key, Hash
    return sjcl.codec.hex.fromBits(hmacFunction.encrypt(data));
};

const makeOktaRequestSync = async function (method, url) {
    let requestOptions = {method};
    requestOptions["headers"] = {
        'Authorization': 'SSWS ' + oktaApiToken,
    };
    return  await fetch(url, requestOptions)
        .then(response => response)
        .catch(console.warn);
};

const parseLinkHeader = function (header) {
    const linkexp = /<[^>]*>\s*(\s*;\s*[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g;
    const paramexp = /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g;
    const matches = header.match(linkexp);
    const rels = {};
    for (let i = 0; i < matches.length; i++) {
        const split = matches[i].split('>');
        const href = split[0].substring(1);
        const ps = split[1];
        const link = {};
        link.href = href;
        const s = ps.match(paramexp);
        for (let j = 0; j < s.length; j++) {
            const p = s[j];
            const paramsplit = p.split('=');
            const name = paramsplit[0];
            link[name] = unquote(paramsplit[1]);
        }
        if (link.rel !== undefined) {
            rels[link.rel] = link;
        }
    }
    return rels;
}


function unquote(value) {
    if (value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') return value.substring(1, value.length - 1);
    return value;
}

const sendsafelyThen = async function (method, path, body) {

    const fullURL = ssHost + path;
    let timestamp = new Date().toISOString().substr(0, 19) + "+0000"; //2014-01-14T22:24:00+0000;

    if (body === undefined) {
        body = '';
    }

    const data = ssApiKey + path + timestamp + body;
    const signature = calculateSignature(data);

    const headers = {
        'ss-api-key': ssApiKey,
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
    }

    return await fetch(fullURL, options)
        .then((response) => response.json())
        .then(data => data)
        .catch(console.warn);
};

let oktaUserListUrl = oktaHost + '/api/v1/groups/' + oktaGroupId + '/users';
let hasMoreOktaUsers = true;

(async function makeRequests(){
    while (hasMoreOktaUsers) {
        const oktaUserListResponse = await makeOktaRequestSync("GET", oktaUserListUrl);
        const users = await oktaUserListResponse.json();
        for (let i = 0, user; user = users[i]; i++) {
            console.log(user.status);
            if (user.status.toUpperCase() !== "DEPROVISIONED") {
                oktaMembers.push(user.profile.email.toLowerCase());
                console.log("Got Okta User: " + user.profile.email.toLowerCase());
            }
        }
        if (oktaUserListResponse.headers['link'] !== undefined && parseLinkHeader(oktaUserListResponse.headers['link'])['next'] !== undefined) {
            oktaUserListUrl = parseLinkHeader(oktaUserListResponse.headers['link'])['next']['href'];
        } else {
            hasMoreOktaUsers = false;
        }
    }

    // No end point exposed to give contact group by specific ID
    console.log('Fetching SS Contact Groups....');
    const ssGroups = await sendsafelyThen('GET',
        '/api/v2.0/enterprise/groups/',
        undefined);
    let ssGroup;

    if(ssGroups && ssGroups.contactGroups) {
        ssGroups.contactGroups.forEach(group => {
            if(group.contactGroupId && group.contactGroupId === ssContactGroupId) {
                return ssGroup = group;
            }
        });
    } else {
        return console.log('No SendSafely Contact Groups were returned');
    }

    if(!ssGroup){
        return console.log(`No SendSafely Contact Group found with the provided ID: ${ssContactGroupId}`);
    }

    const ssGroupUsers = ssGroup.users;
    for(let i = 0, userRecord; userRecord = ssGroupUsers[i]; i++) {
        sendSafelyMembersEmails.push(userRecord.userEmail);
    }

    for (let i = 0, ssMember; ssMember = ssGroupUsers[i]; i++) {
        if (!oktaMembers.includes(ssMember.userEmail)) {
            console.log("REMOVE " + ssMember.userEmail);
            if(!dryRun) {
                const deleteUserPath = `/api/v2.0/group/${ssContactGroupId}/${ssMember.userId}/`;
                const deleteResponse = await sendsafelyThen("DELETE", deleteUserPath, undefined);
                console.log('Delete request Response: ', deleteResponse);
            }
        }
    }

    for(let i = 0, oktaMember; oktaMember = oktaMembers[i]; i++) {
        if (!sendSafelyMembersEmails.includes(oktaMembers[i])) {
            console.log("ADD " + oktaMembers[i]);
            if(!dryRun) {
                const putUserPath = `/api/v2.0/group/${ssContactGroupId}/user/`;
                const putRespone = await sendsafelyThen("PUT", putUserPath, `{"userEmail":"${oktaMember}"}`);
                console.log('Add user request response', putRespone);
            }
        }
    }
})();
