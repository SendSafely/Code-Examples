const sjcl = require("sjcl");
const axios = require('axios');

const pageSize = 100;

function welcome(creds) {
	return sendsafelyThen(creds, 'GET', '/api/v2.0/user/').then(res => {
		if (!res.data['adminUser']) {
			console.log('You are not an admin user!');
			process.exit(0);
		}
		const {firstName, email} = res.data
		console.log(`Welcome, ${firstName} (${email})`);
	});
}


function getAllOrganizationPackagesDeep(creds, body) {
	const res = {data: {packages: [], pagination: {nextRowIndex: 0}, response: 'SUCCESS'}}
	return resolveOrgPackagesDeep(res, creds, body).then((data) => {
		return flatten(data).map(res => res.data).flat()
	})
}

function hasNextPage(res) {
	let {nextRowIndex, rowsCapped} = res.data["pagination"]

	if (nextRowIndex === undefined) {
		if (rowsCapped === 'true') {
			let {rowIndex} = res.data["pagination"]
			delete res.data["packages"]
			console.log(res.data)
			console.log(`Row Index has exceeded your limit at ${rowIndex}. See more information above.`);
		}
		return false;
	}
	return true;
}

function nextRowIndex(res) {
	return res.data["pagination"].nextRowIndex;
}

function flatten(list) {
	return Array.isArray(list) ? list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []) : list;
}

function getAllOrganizationPackagesShallow(creds, body) {
	const res = {data: {pagination: {nextRowIndex: 0}}}
	return resolveOrgPackagesShallow(res, creds, body).then((data) => flatten(data));
}

function resolveOrgPackagesShallow(res, creds, body) {
	let promises = [];
	if (hasNextPage(res)) {
		promises.push(organizationSearch(creds, body, nextRowIndex(res))
			.then(res => Promise.all([res.data["packages"], resolveOrgPackagesShallow(res, creds, body)])))
	} else {
		promises.push(res.data["packages"]);
	}
	return Promise.all(promises);
}

function firstDate(res){
	return res.data.packages.slice(1)[0]["packageUpdateTimestamp"];
}

function lastDate(res){
	return res.data.packages[0]["packageUpdateTimestamp"];
}


function resolveOrgPackagesDeep(res, creds, body) {
	let promises = [];
	for (let pkg of res.data["packages"]) {
		// console.log(pkg.packageId)
		promises.push(packageInformation(creds, pkg["packageId"]));
	}

	if (hasNextPage(res) && successfulResponse(res)) {
		if (containsPackages(res)) {
			// Gets the first and last items, the server sorts this list for us.
			console.log(`Collected packages ${firstDate(res)} to ${lastDate(res)}`)
		}

		promises.push(organizationSearch(creds, body, nextRowIndex(res))
			.then(orgSearchResult => resolveOrgPackagesDeep(orgSearchResult, creds, body)))

	}
	return Promise.all(promises);
}

function containsPackages(res) {
	return res.data.packages !== undefined && res.data.packages.length > 0;
}

function successfulResponse(res) {
	return res.data.response === 'SUCCESS'
}


function organizationSearch(creds, body, fromRow) {
	return sendsafelyThen(creds, "POST", "/api/v2.0/package/organization/search/", body, fromRow, pageSize)
}

function packageInformation(creds, packageId) {
	return sendsafelyThen(creds, "GET", `/api/v2.0/package/${packageId}/`);
}

function sendsafelyThen(creds, method, path, body, rowIndex, pageSize) {
	let {ssHost, ssApiKey, ssApiSecret} = creds;
	let params = {}
	if (rowIndex !== undefined) {
		params.rowIndex = rowIndex;
	}
	if (pageSize !== undefined) {
		params.pageSize = pageSize;
	}
	if (body === undefined) {
		body = "";
	}

	let url = `${ssHost}${path}`
	let timestamp = `${new Date().toISOString().substr(0, 19)}+0000`;
	let signature = calculateSignature(ssApiKey, ssApiSecret, path, body, timestamp);

	return axios({
		method: method,
		url: url,
		params: params,
		headers: {
			'ss-api-key': ssApiKey,
			'ss-request-signature': signature,
			'ss-request-timestamp': timestamp,
			'Content-Type': 'application/json'
		},
		data: body
	});
}

function calculateSignature(apiKey, apiSecret, path, body, timestamp) {
	let data = apiKey + path + timestamp + body;

	let hmacFunction = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(apiSecret), sjcl.hash.sha256); // Key, Hash
	return sjcl.codec.hex.fromBits(hmacFunction.encrypt(data));
}

module.exports = {
	hasNextPage,
	getAllOrganizationPackagesDeep,
	getAllOrganizationPackagesShallow,
	welcome
}
