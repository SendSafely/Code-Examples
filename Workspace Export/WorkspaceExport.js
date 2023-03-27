const {writeFileSync, existsSync, mkdirSync} = require('fs');
const chalk = require('chalk');
const fetch = require('make-fetch-happen');
const sjcl = require('sjcl');
const cliProgress = require('cli-progress');
const _path = require('path');
const {argv} = require('yargs');
const SendSafely = require('@sendsafely/sendsafely'); // for distribution

const {apiKey, apiSecret, secureLink, out,} = argv;
const fileIdToPath = {};
// should be indexed by fileId and have progressbar, filename and directoryPath as attributes
const filenames = {};
let keycode = undefined;
let packageid = undefined;


if (!apiKey || !apiSecret || !secureLink || !secureLink.split('/receive/')[0]) {
	printHelpExit();
}

let host = secureLink.split('/receive/')[0];

const sendSafely = new SendSafely(host, apiKey, apiSecret);

// go here if it isn't working for you
// https://github.com/visionmedia/node-progress/issues/104
const progressContainer = new cliProgress.MultiBar({
	clearOnComplete: false,
	hideCursor: true,
	format: `{percentage}% [${'{bar}'}] : {label}`
}, cliProgress.Presets.shades_classic);

let overallProgress = undefined;
let currentFileProgress = undefined;
const downloaded = [];

sendSafely.on(`sendsafely.error`, (data) => {
	console.log(data);
});

sendSafely.verifyCredentials((email) => {
	console.log(`Connected to SendSafely as ${chalk.bold(email)} on ${chalk.bold(host.split('//')[1])}`);

	sendSafely.packageInformationFromLink(secureLink, (packageInformation) => {
		const {files, directories, label: workspace, rootDirectoryId, packageId, keyCode} = packageInformation;
		keycode = keyCode;
		packageid = packageId;

		let backupDir;
		if (out === undefined) {
			let date = new Date(Date.now()).toISOString().replace(/:/g,'-');
			//backupDir = _path.join('.', workspace, new Date(Date.now()).toISOString());
			backupDir = _path.join('.', workspace, date);
		} else {
			backupDir = out;
		}

		// console.log(`Now downloading all files`);
		console.log(`Exporting  "${chalk.bold(workspace)}" to "${chalk.bold(backupDir)}"`);
		// console.log(`To: ${backupDir}`);

		recurseDirectories(packageId, rootDirectoryId, backupDir);
		// Write the file to disk once it's downloaded
		sendSafely.on('save.file', (data) => {
			const {fileId, file} = data;

			let filename = filenames[fileId];

			let path = fileIdToPath[fileId];

			currentFileProgress.update(100, {
				label: `${filenames[fileId]} (Saving to disk)`
			});


			mkdirIfNotExists(path);
			writeFileSync(`${path}/${filename}`, file);

			downloaded.push(fileId);
			updateOverallProgressBar();

			if (downloaded.length === Object.keys(fileIdToPath).length) {
				updateCurrentFileProgress(100, `${filenames[fileId]}`);
				progressContainer.stop();
				console.log(`Export of "${workspace}" complete`);
			} else {
				updateCurrentFileProgress(100, `${filenames[fileId]} (Preparing for next file)`);
			}
		});


		sendSafely.on(`download.progress`, (data) => {
			let {fileId, percent} = data;
			updateCurrentFileProgress(percent, filenames[fileId]);
		});
	});
});

function getSanitizedPathName(path) {	
	const nonAllowedCharacters = /[<>:"/\\|?*]/g;	
	return path.replace(nonAllowedCharacters, "_");	
}

function buildFileIndex(directory, directoryPath) {
	let {files, directoryId} = directory;
	files.forEach((file) => {
		const {fileName, fileId} = file;
		filenames[fileId] = getSanitizedPathName(fileName);
		fileIdToPath[fileId] = directoryPath;
		sendSafely.downloadFileFromDirectory(packageid, directoryId, fileId, keycode);
	});
}

async function recurseDirectories(packageId, directoryId, directoryPath) {
	const ssResponse = await sendsafelyThen('GET',
		`/api/v2.0/package/${packageId}/directory/${directoryId}/`,
		undefined);
	let {subDirectories} = ssResponse;

	buildFileIndex(ssResponse, directoryPath);

	if (subDirectories !== undefined) {
		let nextDirectory;
		for(let i = 0; i < subDirectories.length; i += 1) {
			nextDirectory = subDirectories[i];
			let nextDirectoryName = getSanitizedPathName(nextDirectory.name.toString());
			await recurseDirectories(packageId, nextDirectory.directoryId, _path.join(directoryPath, nextDirectoryName));
		}
	}
}

function updateOverallProgressBar(append) {
	// If we haven't initialized yet, initialize
	if (overallProgress === undefined) {
		overallProgress = progressContainer.create(200, 0);
		overallProgress.start(100, 0);
		overallProgress.update(0, {
			label: `(indexing files)`
		});
	} else {
		let fileCount = Object.keys(fileIdToPath).length;
		let downloadedCount = Object.keys(downloaded).length;
		let pct = (downloadedCount / fileCount) * 100;
		overallProgress.update(pct, {
			label: `${downloadedCount} of ${fileCount} files downloaded ${append || ''}`
		});
	}
}

function updateCurrentFileProgress(percent, label) {
	if (currentFileProgress === undefined) {
		const bar = progressContainer.create(200, 0);
		// start the bar
		bar.start(100, 0);
		bar.update(0, {
			label: label
		});
		currentFileProgress = bar;
	}

	currentFileProgress.update(percent, {
		label: `${label || ''}`
	});

}

function mkdirIfNotExists(path) {
	existsSync(`./${path}`) || mkdirSync(`./${path}`, {recursive: true});
}

function printHelpExit() {
	console.log('Usage:\n\n' +
		'node ./WorkspaceExport.js --secureLink="YOUR SECURE LINK" --apiKey="YOUR API KEY" --apiSecret="YOUR API SECRET"' +
		'\n\n' +
		'Options:\n' +
		' --secureLink The shareable link for the Workspace that you are planning to export\n' +
		' --apiKey Your SendSafely API key obtained the API Keys section of your Profile page when logged into SendSafely\n' +
		' --apiSecret Your SendSafely API secret obtained the API Keys section of your Profile page when logged into SendSafely\n' +
		' --out Optional parameter the specifies the location of the folder to export the files to on your system. The script will automatically create the folder if it does not exist. Defaults to {workspace label}/{timestamp} of the current directory.\n' +
		'    \n' +
		'    \n');
	process.exit(1);
}

async function sendsafelyThen(method, path, body) {

	const fullURL = host + path;
	let timestamp = new Date().toISOString().substr(0, 19) + "+0000"; //2014-01-14T22:24:00+0000;

	if (body === undefined) {
		body = '';
	}

	const data = apiKey + path + timestamp + body;
	const signature = calculateSignature(data);

	const headers = {
		'ss-api-key': apiKey,
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
}

function calculateSignature(data) {
	const hmacFunction = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(apiSecret), sjcl.hash.sha256); // Key, Hash
	return sjcl.codec.hex.fromBits(hmacFunction.encrypt(data));
}
