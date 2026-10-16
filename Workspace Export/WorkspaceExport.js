const {writeFileSync, existsSync, mkdirSync, realpathSync} = require('fs');
const chalk = require('chalk');
const cliProgress = require('cli-progress');
const _path = require('path');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const SendSafely = require('@sendsafely/sendsafely'); // for distribution

const crypto = require('crypto'); // Add to top of file

const argv = yargs(hideBin(process.argv)).argv;
const {secureLink, out,} = argv;

const apiKey = process.env.SENDSAFELY_API_KEY || argv.apiKey;
const apiSecret = process.env.SENDSAFELY_API_SECRET || argv.apiSecret;

const fileIdToPath = {};
// should be indexed by fileId and have progressbar, filename and directoryPath as attributes
const filenames = {};
let keycode = undefined;
let packageid = undefined;


if (!apiKey || !apiSecret || !secureLink || !secureLink.split('/receive/')[0]) {
	printHelpExit();
}

if (!secureLink || !secureLink.startsWith('https://')) {
	console.error(chalk.red("Security Error: The secureLink must use a secure HTTPS protocol."));
	process.exit(1);
}

let host = secureLink.split('/receive/')[0];

const url = new URL(host);
if (url.protocol !== "https:") {
	throw new Error("Host must use HTTPS.");
}

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

	const runningHost = new URL(host).hostname;
	console.log(`Connected to SendSafely as ${chalk.bold(email)} on ${chalk.bold(runningHost)}`);

	sendSafely.packageInformationFromLink(secureLink, (packageInformation) => {
		const {files, directories, label: workspace, rootDirectoryId, packageId, keyCode} = packageInformation;
		keycode = keyCode;
		packageid = packageId;

		let backupDir;
		if (out === undefined) {
			let date = new Date(Date.now()).toISOString().replace(/:/g,'-');
			let sanitizedWorkspace = getSanitizedPathName(workspace);
			backupDir = _path.resolve('.', sanitizedWorkspace, date); // Use _path.resolve to anchor it absolutely
		} else {
			backupDir = _path.resolve(out);
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
			const dirCheck = isPathSafe(backupDir, path);
			if (!dirCheck.safe) {
				abortOnTraversal('directory', path, dirCheck.resolved);
			}

			if (containsTraversalSegment(filename)) {
				abortOnTraversal('filename', filename, null);
			}

			const fileCheck = isPathSafe(backupDir, _path.join(path, filename));
			if (!fileCheck.safe) {
				abortOnTraversal('resolved file path', filename, fileCheck.resolved);
			}

			const absoluteTargetDir = _path.resolve(path);
			const absoluteTargetFile = fileCheck.resolved;

			currentFileProgress.update(100, {
				label: `${filenames[fileId]} (Saving to disk)`
			});

			mkdirIfNotExists(absoluteTargetDir);
			writeFileSync(absoluteTargetFile, file);

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

function isPathSafe(base, target) {
	const absoluteBase = _path.resolve(base) + _path.sep;
	const resolved = _path.resolve(base, target);
	const lexicallySafe = resolved === _path.resolve(base) || (resolved + _path.sep).startsWith(absoluteBase);
	if (!lexicallySafe) {
		return {safe: false, resolved};
	}

	const realBase = realpathNearestExisting(_path.resolve(base));
	const realParent = realpathNearestExisting(_path.dirname(resolved));
	const symlinkSafe = realParent === realBase || (realParent + _path.sep).startsWith(realBase + _path.sep);

	return {safe: symlinkSafe, resolved};
}

function realpathNearestExisting(dir) {
	let current = dir;
	while (!existsSync(current)) {
		const parent = _path.dirname(current);
		if (parent === current) break; // reached filesystem root without finding anything real
		current = parent;
	}
	return realpathSync(current);
}

function containsTraversalSegment(name) {
	if (!name) return false;
	const segments = name.split(/[\\/]/);
	if (segments.length > 1) return true; // any separator at all is disallowed here
	return segments.includes('..');
}

function abortOnTraversal(what, value, resolved) {
	console.error(chalk.red(`\n[SECURITY ALERT] Blocked a path traversal breakout attempt (${what}).`));
	console.error(chalk.red(`Offending value: ${value}`));
	if (resolved) {
		console.error(chalk.red(`Resolved target: ${resolved}`));
	}
	process.exit(1);
}

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
		let downloadedCount = downloaded.length;
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

function mkdirIfNotExists(absolutePath) {
	existsSync(absolutePath) || mkdirSync(absolutePath, {recursive: true});
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
		.catch((err) => {
			console.error(chalk.red(`API request failed: ${method} ${path} — ${err.message}`));
			process.exit(1);
		});
}

function calculateSignature(data) {
	return crypto
		.createHmac('sha256', apiSecret)
		.update(data)
		.digest('hex');
}