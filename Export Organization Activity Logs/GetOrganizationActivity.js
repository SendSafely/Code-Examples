/* START USER DEFINED PARAMETERS */

const ssHost = "https://yourcompany.sendsafely.com";
const ssApiKey = "PUT_YOUR_API_KEY_HERE";
const ssApiSecret = "PUT_YOUR_API_SECRET_HERE";

const fromDate = '3/1/2020';
const toDate = '10/10/2020';

/* END USER DEFINED PARAMETERS */

const {getAllOrganizationPackagesShallow, welcome} = require("./util/util");

const creds = {
	ssHost: ssHost,
	ssApiKey: ssApiKey,
	ssApiSecret: ssApiSecret
}

welcome(creds).then((res) => {
	let body = `{"fromDate": "${fromDate}", "toDate": "${toDate}"}`
	getAllOrganizationPackagesShallow(creds, body).then(packages => {
		console.log("User,Date,Package ID,Package Status,Recipients,Files");
		printOrganizationActivity(packages)
		console.log(`${packages.length} packages shown`)
	})
});

function printOrganizationActivity(packages) {
	packages.forEach(pkg => {
		const {packageUpdateTimestamp, packageId, filenames, packageStateStr, packageUserName} = pkg;
		let files = semiSeparated(filenames);
		let recipients = semiSeparated(pkg["recipients"]);
		console.log(`${packageUserName} ,${packageUpdateTimestamp} ,${packageId} ,${packageStateStr} ,${recipients} ,${files}`);
	})
}

function semiSeparated(anArray) {
	return anArray.toString().replace(/,/g, ";");
}
