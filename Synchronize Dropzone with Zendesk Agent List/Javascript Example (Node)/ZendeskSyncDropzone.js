(async function(){
    const crypto = require('node:crypto');
    const SendSafely = require('@sendsafely/sendsafely');

    var ssHost = "https://company_name.sendsafely.com";
    var zdHost = "https://company_name.zendesk.com";
    var ssApiKey = "PUT_YOUR_SENDSAFELY_API_KEY_HERE";
    var ssApiSecret = "PUT_YOUR_SENDSAFELY_API_SECRET_HERE";

    const zdClientId = "PUT_YOUR_ZENDESK_OAUTH_CLIENT_ID_HERE";
    const zdClientSecret = "PUT_YOUR_ZENDESK_OAUTH_CLIENT_SECRET_HERE";
    const zdScope = "read write";


    let zdOauthToken;
    try {
        console.log("Requesting temporary Zendesk OAuth token via Client Credentials...");
        const tokenResponse = await fetch(`${zdHost}/oauth/tokens`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "client_credentials",
                client_id: zdClientId,
                client_secret: zdClientSecret,
                scope: zdScope
            })
        });

        if (!tokenResponse.ok) {
            const errorDetails = await tokenResponse.text();
            throw new Error(`Zendesk token API returned status ${tokenResponse.status}: ${errorDetails}`);
        }

        const tokenData = await tokenResponse.json();
        zdOauthToken = tokenData.access_token;
        console.log("Successfully retrieved temporary OAuth token.");
    } catch (e) {
        console.error("Fatal Error: Could not authenticate with Zendesk.", e.message);
        return;
    }

    const zdRequestHeaders =  {
        Authorization: `Bearer ${zdOauthToken}`
    };

    const sendSafely = new SendSafely(ssHost, ssApiKey, ssApiSecret);
    const zendeskMembers = [];
    const sendSafelyMembers = [];

    const updateZendeskListOfMembers = async (zendeskMembers, zdRequest) => {
        let matches = zdRequest && zdRequest.users;
        if (matches) {
            let userEmail;
            for (let i = 0; i < matches.length; i++) {
                userEmail = matches[i]?.email;
                if(!userEmail) {
                    console.log(`No email for this Zendesk User '${matches[i]?.name}'. Not adding to Zendesk Members list.`);
                }
                if (userEmail && !zendeskMembers.includes(userEmail)) {
                    zendeskMembers.push(userEmail.toLowerCase().trim());
                    console.log("Got Zendesk User: " + userEmail.toLowerCase());
                } else {
                    console.log(`Zendesk User '${matches[i]?.email}' already present in Zendesk Members list.`);
                }
            }
        }
        let morePagesUrl = zdRequest?.next_page || (zdRequest?.meta?.has_more ?  zdRequest?.links?.next : null);
        while(morePagesUrl) {
            let zdRequest = await fetch(morePagesUrl, { headers: zdRequestHeaders}).then(r => r.json());
            morePagesUrl = zdRequest?.next_page || (zdRequest?.meta?.has_more ?  zdRequest?.links?.next : null);
            await updateZendeskListOfMembers(zendeskMembers, zdRequest);
        }
        return zendeskMembers;
    };

    sendSafely.on('sendsafely.error', function(error, errorMsg) {
        console.log(error)
    });

    let zdURLToRequest = zdHost + "/api/v2/users.json?role=agent";
    let zdRequest = await fetch(zdURLToRequest, { headers: zdRequestHeaders}).then(r => r.json());

    await updateZendeskListOfMembers(zendeskMembers, zdRequest);

    zdURLToRequest = zdHost + "/api/v2/users.json?role=admin";
    zdRequest = await fetch(zdURLToRequest, { headers: zdRequestHeaders }).then(r => r.json());

    await updateZendeskListOfMembers(zendeskMembers, zdRequest);

    const groups = await makeRequestToSendSafely("GET", "/api/v2.0/user/dropzone-recipients/");
    const members = groups.recipientEmailAddresses;

    for (let j = 0; j < members.length; j++) {
        sendSafelyMembers.push(members[j].toLowerCase().trim());
        console.log("Got SendSafely User: " + members[j].toLowerCase());
    }

    for (let i = 0; i < sendSafelyMembers.length; i++) {
        if (zendeskMembers.indexOf(sendSafelyMembers[i]) === -1) {
            console.log("REMOVE " + sendSafelyMembers[i]);
            const result = await makeRequestToSendSafely("DELETE", "/api/v2.0/user/dropzone-recipients/", JSON.stringify({
                "userEmail": sendSafelyMembers[i]
            }));
            console.log(result);
        }
    }

    for (let i = 0; i < zendeskMembers.length; i++) {
        if (sendSafelyMembers.indexOf(zendeskMembers[i]) === -1) {
            console.log("ADD " + zendeskMembers[i]);
            const result = await makeRequestToSendSafely("PUT", "/api/v2.0/user/dropzone-recipients/", JSON.stringify({
                "userEmail": zendeskMembers[i]
            }));
            console.log(result);
        }
    }

    async function makeRequestToSendSafely(method, url, messageData) {
        const timestamp = new Date().toISOString().substr(0, 19) + "+0000";

        let body = messageData;
        if (body !== undefined && body !== null && typeof body !== 'string') {
            body = JSON.stringify(body);
        }
        if (body === undefined || body === null) {
            body = '';
        }

        const messageString = ssApiKey + url + timestamp + body;
        const signature = signMessage(messageString);

        const headers = {
            'ss-api-key': ssApiKey,
            'ss-request-timestamp': timestamp,
            'ss-request-signature': signature,
            'ss-request-api': 'REST_API'
        };

        const options = {
            headers,
            method
        };

        if (body && method !== 'GET') {
            options.body = body;
            headers['content-type'] = 'application/json';
        }

        return await fetch(ssHost + url, options)
            .then((response) => response.json())
            .then(data => data)
            .catch(console.warn);
    }

    function signMessage(messageString) {
        return crypto
            .createHmac('sha256', ssApiSecret)
            .update(messageString)
            .digest('hex');
    }
}());