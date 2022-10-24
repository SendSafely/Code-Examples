(async function(){
    var SendSafely = require('@sendsafely/sendsafely');
    const sjcl = require("sjcl");
    const MakeFetch = require("make-fetch-happen");

    var ssHost = "https://company_name.sendsafely.com";
    var zdHost = "https://company_name.zendesk.com";
    var ssApiKey = "PUT_YOUR_SENDSAFELY_API_KEY_HERE";
    var ssApiSecret = "PUT_YOUR_SENDSAFELY_API_SECRET_HERE";
    var zdUsername = "PUT_YOUR_ZENDESK_USERNAME_HERE";
    var zdPassword = "PUT_YOUR_ZENDESK_PASSWORD_HERE";
    const zdRequestHeaders =  {
        Authorization: "Basic " + Buffer.from(`${zdUsername}:${zdPassword}`).toString('base64')
    };

    var sendSafely = new SendSafely(ssHost, ssApiKey, ssApiSecret);
    var zendeskMembers = [];
    var sendSafelyMembers = [];
    var sendSafelyMemberIds = [];
    var ssGroupId;

    sendSafely.on('sendsafely.error', function(error, errorMsg) {
        console.log(error)
    });

    let zdURLToRequest = zdHost + "/api/v2/users.json?role=agent";
    let zdRequest = await MakeFetch(zdURLToRequest, { headers: zdRequestHeaders}).then(r => r.json());
    let matches = zdRequest && zdRequest.users;

    if (matches) {
        for (var i = 0; i < matches.length; i++) {
            zendeskMembers.push(matches[i].email.toLowerCase());
            console.log("Got Zendesk User: " + matches[i].email.toLowerCase());
        }

    }

    zdURLToRequest = zdHost + "/api/v2/users.json?role=admin";
    zdRequest = await MakeFetch(zdURLToRequest, { headers: zdRequestHeaders }).then(r => r.json());
    matches = zdRequest && zdRequest.users;

    for (var i = 0; i < matches.length; i++) {
        zendeskMembers.push(matches[i].email.toLowerCase());
        console.log("Got Zendesk User: " + matches[i].email.toLowerCase());
    }

    var groups = await makeRequestToSendSafely("GET", "/api/v2.0/user/dropzone-recipients/");
    var members = groups.recipientEmailAddresses;

    for (var j = 0; j < members.length; j++) {
        sendSafelyMembers.push(members[j].toLowerCase());
        console.log("Got SendSafely User: " + members[j].toLowerCase());
    }

    for (var i = 0; i < sendSafelyMembers.length; i++) {
        if ($.inArray(sendSafelyMembers[i], zendeskMembers) == -1) {
            console.log("REMOVE " + sendSafelyMembers[i]);
            var result = await makeRequestToSendSafely("DELETE", "/api/v2.0/user/dropzone-recipients/", JSON.stringify({
                "userEmail": sendSafelyMembers[i]
            }));
            console.log(result);
        }
    }

    for (var i = 0; i < zendeskMembers.length; i++) {
        if ($.inArray(zendeskMembers[i], sendSafelyMembers) == -1) {
            console.log("ADD " + zendeskMembers[i]);
            var result = await makeRequestToSendSafely("PUT", "/api/v2.0/user/dropzone-recipients/", JSON.stringify({
                "userEmail": zendeskMembers[i]
            }));
            console.log(result);
        }
    }

    async function makeRequestToSendSafely(method, url, messageData) {

        var timestamp = new Date().toISOString().substr(0, 19) + "+0000"; //2014-01-14T22:24:00+0000;

        var messageString = ssApiKey + url + timestamp;
        if (messageData != "" && messageData != null) {
            messageString += messageData;
        }
        var signature = signMessage(messageString);
        const headers = {
            'ss-api-key': ssApiKey,
            'ss-request-timestamp': timestamp,
            'ss-request-signature': signature,
        };

        let options = {
            headers,
            method
        };

        if(messageData && "GET" !== method) {
            options.body = messageData;
            headers['content-type'] = 'application/json';
        }

        return await MakeFetch(ssHost + url, options)
            .then((response) => response.json())
            .then(data => data)
            .catch(console.warn);
    }

    function signMessage(messageString) {
        var hmacFunction = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(ssApiSecret), sjcl.hash.sha256); // Key, Hash
        return sjcl.codec.hex.fromBits(hmacFunction.encrypt(messageString));
    }
}());
