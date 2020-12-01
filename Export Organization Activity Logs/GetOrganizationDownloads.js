/* START USER DEFINED PARAMETERS */

const ssHost = "https://yourcompany.sendsafely.com";
const ssApiKey = "PUT_YOUR_API_KEY_HERE";
const ssApiSecret = "PUT_YOUR_API_SECRET_HERE";

const fromDate = '3/1/2020';
const toDate = '10/10/2020';

/* END USER DEFINED PARAMETERS */

const {getAllOrganizationPackagesDeep, welcome} = require("./util/util");
const creds = {
	ssHost: ssHost,
	ssApiKey: ssApiKey,
	ssApiSecret: ssApiSecret
}


welcome(creds).then(res => {
	console.log('"PackageId","DownloadTimestamp", "Recipient", "Filename", "Uploader"');


	let body = "{'fromDate': '" + fromDate + "','filename':'','sender':'','toDate': '" + toDate + "','recipient':'','status':''}"
	getAllOrganizationPackagesDeep(creds, body).then(results => {
		let denormalized = denormalizePackages(results);
		denormalized.forEach(pkg => {
			let {packageId, downloadTimestamp, uploader, fileName, packageSender} = pkg;
			console.log(`"${packageId}","${downloadTimestamp}","${uploader}","${fileName}","${packageSender}"`);
		})

		console.log(`Found ${denormalized.length} downloads.`);
	})
});

function reduceConfirmation(confirmation) {
	let {isMessage, timestamp} = confirmation

	return {
		downloadTimestamp: timestamp,
		fileName: isMessage ? 'SecureMessage.txt' : confirmation["file"].fileName
	}
}

function reduceRecipient(recipient) {
	let {email} = recipient
	return {uploader: email}
}

function reducePackage(pkg) {
	let {packageId, packageSender} = pkg;
	return {
		packageId: packageId,
		packageSender: packageSender
	}
}

function denormalizePackages(packages) {
	return packages.map(pkg => denormalizePackage(pkg)).flat();
}

function denormalizePackage(pkg) {
	return pkg["recipients"].map(recipient => {
		return recipient["confirmations"].map(conf => {
			return {
				...reduceConfirmation(conf),
				...reduceRecipient(recipient),
				...reducePackage(pkg)
			}
		})
	}).flat()
}

