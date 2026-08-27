(async function(){
    const crypto = require('node:crypto');

    // ==========================================
    // START USER DEFINED VARIABLES
    // ==========================================

    const ssHost = "https://company_name.sendsafely.com";
    const ssApiKey = "PUT_YOUR_SENDSAFELY_API_KEY_HERE";
    const ssApiSecret = "PUT_YOUR_SENDSAFELY_API_SECRET_HERE";

    const zdHost = "https://company_name.zendesk.com";
    const zdClientId = "PUT_YOUR_ZENDESK_OAUTH_CLIENT_ID_HERE";
    const zdClientSecret = "PUT_YOUR_ZENDESK_OAUTH_CLIENT_SECRET_HERE";
    const zdScope = "read write";


    // Contact group id for the contact group to be synced with Zendesk User Segment, for individual Workspaces.
    // For each Workspace, only ONE Workspace-associated Contact Group can be updated per script run.
    const workspaceIdToContactGroupId = {
        "YGYS-YXEB": "contact-group-id-1",
        "CCCC-3333": "contact-group-id-2",
    };

    // keys of workspaceIdToZendeskTag object can be either packageID (in URL) or packageCode (in shareable link) of Workspace
    const workspaceIdToZendeskTag = {
        "YGYS-YXEB": "product-1-tag",
        "BBBB-2222": "product-2-tag",
        "CCCC-3333": "product-3-tag"
    };
    // ==========================================
    // END USER DEFINED VARIABLES
    // ==========================================

    // 1. Fetch a temporary Zendesk OAuth access token via Client Credentials
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

    // Begin main synchronization execution block
    try {
        for (const key of Object.keys(workspaceIdToZendeskTag)) {
            console.log(`\n--- Starting sync for Workspace ${key} using tag "${workspaceIdToZendeskTag[key]}" ---`);

            const zendeskMembers = [];
            const sendSafelyMembers = [];
            const sendSafelyMemberIds = [];
            const sendSafelyContactGroupMembers = [];
            const sendSafelyContactGroupMemberIds = [];
            const workspaceManagers = [];

            let nextPage = `${zdHost}/api/v2/search/export.json?filter[type]=user&query=tags:${workspaceIdToZendeskTag[key]}`;

            // 2. Fetch targeted user profiles dynamically from Zendesk (Async Pagination)
            while (nextPage != null) {
                const zdResponse = await makeZendeskRequest("GET", nextPage);
                if (zdResponse.status === 401) {
                    console.log("Zendesk Authentication Error: " + await zdResponse.text());
                    return;
                }

                const body = await zdResponse.json();
                const matches = body.results || [];

                for (let i = 0; i < matches.length; i++) {
                    if (matches[i].active && !matches[i].suspended) {
                        if (matches[i].email) {
                            zendeskMembers.push(matches[i].email.toLowerCase().trim());
                            console.log("Got Zendesk User: " + matches[i].email);
                        } else {
                            console.log("No email for Zendesk User", matches[i].name);
                        }
                    }
                }

                if (body.meta && body.meta.has_more) {
                    nextPage = body.links.next;
                } else {
                    break;
                }
            }

            const contactGroupId = workspaceIdToContactGroupId[key] || null;

            if (zendeskMembers.length === 0) {
                console.log("Warning: No active users found for Zendesk Tag " + workspaceIdToZendeskTag[key]);
            }
            if (zendeskMembers.length > 1000 && !contactGroupId) {
                console.log("Error: Too many users to add to the workspace directly. Please specify a contactGroupId.");
                process.exit(1);
            }

            // 3. Query SendSafely Workspace configuration
            const packageBody = await makeSSRequest("GET", `/api/v2.0/package/${key}/`);
            if (packageBody.response === "UNKNOWN_PACKAGE") {
                console.log(`SendSafely Error: ${packageBody.message} : ${key}`);
                continue;
            }

            const members = packageBody.recipients || [];
            for (let j = 0; j < members.length; j++) {
                sendSafelyMembers.push(members[j].email.toLowerCase().trim());
                sendSafelyMemberIds.push(members[j].recipientId);
                console.log("Got SendSafely Workspace User: " + members[j].email.toLowerCase());

                if (["MANAGER", "OWNER", "CONTRIBUTOR"].includes(members[j].roleName)) {
                    workspaceManagers.push(members[j].email.toLowerCase().trim());
                }
            }

            // 4. Resolve and process Contact Groups (if configured)
            if (contactGroupId) {
                let enterpriseContactGroupsExists = false;
                try {
                    const enterpriseResponse = await makeSSRequest("GET", '/api/v2.0/enterprise/groups/');
                    const enterpriseContactGroupsJson = enterpriseResponse.contactGroups || [];

                    for (let i = 0; i < enterpriseContactGroupsJson.length; i++) {
                        if (enterpriseContactGroupsJson[i].contactGroupId === contactGroupId) {
                            enterpriseContactGroupsExists = true;
                            const groupUsers = enterpriseContactGroupsJson[i].users || [];
                            for (let j = 0; j < groupUsers.length; j++) {
                                sendSafelyContactGroupMembers.push(groupUsers[j].userEmail.toLowerCase().trim());
                                sendSafelyContactGroupMemberIds.push(groupUsers[j].userId);
                                console.log("Got SendSafely Enterprise Contact Group User: " + groupUsers[j].userEmail.toLowerCase());
                            }
                            break;
                        }
                    }
                } catch (enterpriseErr) {
                    console.log("Enterprise Contact Group retrieval failed or not permitted. Checking user level contact groups...");
                }

                if (!enterpriseContactGroupsExists) {
                    let groupExists = false;
                    const userGroupsResponse = await makeSSRequest("GET", "/api/v2.0/user/groups/");
                    const groupsJson = userGroupsResponse.contactGroups || [];

                    for (let i = 0; i < groupsJson.length; i++) {
                        if (groupsJson[i].contactGroupId === contactGroupId) {
                            groupExists = true;
                            const groupUsers = groupsJson[i].users || [];
                            for (let j = 0; j < groupUsers.length; j++) {
                                sendSafelyContactGroupMembers.push(groupUsers[j].userEmail.toLowerCase().trim());
                                sendSafelyContactGroupMemberIds.push(groupUsers[j].userId);
                                console.log("Got SendSafely Contact Group User: " + groupUsers[j].userEmail.toLowerCase());
                            }
                            break;
                        }
                    }
                    if (!groupExists) {
                        console.log("Error: Contact Group " + contactGroupId + " does not exist.");
                        process.exit(1);
                    }
                }
            }

            // 5. Run Sync: Process Adds/Removes inside SendSafely
            if (contactGroupId) {
                // If contact groups are used, delete anyone from the group that is not in Zendesk
                for (let i = 0; i < sendSafelyContactGroupMembers.length; i++) {
                    if (!zendeskMembers.includes(sendSafelyContactGroupMembers[i])) {
                        console.log("REMOVING " + sendSafelyContactGroupMembers[i] + " FROM CONTACT GROUP");
                        await makeSSRequest("DELETE", `/api/v2.0/group/${contactGroupId}/${sendSafelyContactGroupMemberIds[i]}/`);
                    }
                }

                // If contact groups are used, add anyone from Zendesk that is missing to the group
                for (let i = 0; i < zendeskMembers.length; i++) {
                    if (!sendSafelyContactGroupMembers.includes(zendeskMembers[i])) {
                        console.log("ADDING " + zendeskMembers[i] + " TO CONTACT GROUP");
                        await makeSSRequest("PUT", `/api/v2.0/group/${contactGroupId}/user/`, JSON.stringify({userEmail: zendeskMembers[i]}));
                    }
                }
            } else {
                // If contact groups are NOT used, add anyone from Zendesk that is missing to the Workspace directly
                for (let i = 0; i < zendeskMembers.length; i++) {
                    if (!sendSafelyMembers.includes(zendeskMembers[i])) {
                        console.log("ADDING " + zendeskMembers[i] + " TO WORKSPACE");
                        await makeSSRequest("PUT", `/api/v2.0/package/${key}/recipient/`, JSON.stringify({email: zendeskMembers[i]}));
                    }
                }
            }

            // Lastly, always check the workspace and delete anyone that is not in Zendesk (unless they are a manager/owner)
            for (let i = 0; i < sendSafelyMembers.length; i++) {
                if (!zendeskMembers.includes(sendSafelyMembers[i]) && !workspaceManagers.includes(sendSafelyMembers[i])) {
                    console.log("REMOVING " + sendSafelyMembers[i] + " FROM WORKSPACE");
                    await makeSSRequest("DELETE", `/api/v2.0/package/${key}/recipient/${sendSafelyMemberIds[i]}`);
                }
            }
        }
    } catch (err) {
        console.error("Execution failure: ", err.message);
    }

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================

    async function makeZendeskRequest(method, url) {
        return await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${zdOauthToken}`,
                'Content-Type': 'application/json'
            }
        });
    }

    async function makeSSRequest(method, url, messageData) {
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
            'ss-request-api': 'REST_API' // Standardized to REST_API for native fetch requests
        };

        const options = {
            headers,
            method
        };

        if (body && method !== 'GET') {
            options.body = body;
            headers['content-type'] = 'application/json';
        }

        const res = await fetch(ssHost + url, options);
        const text = await res.text();

        if (text.includes("AUTHENTICATION_FAILED")) {
            throw new Error(`SendSafely Auth Failure: ${text}`);
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes("application/json")) {
            throw new Error("Incorrect response type. Check your SendSafely hostname.");
        }

        return JSON.parse(text);
    }

    function signMessage(messageString) {
        return crypto
            .createHmac('sha256', ssApiSecret)
            .update(messageString)
            .digest('hex');
    }
}());