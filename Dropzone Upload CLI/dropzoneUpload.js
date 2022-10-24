#! /usr/bin/env node

const {SendSafelyDropzone} = require('@sendsafely/sendsafely');

const cliProgress = require('cli-progress');
const yargs = require('yargs');
const chalk = require('chalk');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const {URLSearchParams} = require('url');


const chalkError = chalk.bold.red;
const chalkSuccess = chalk.greenBright.bold;
const safelyOrange = chalk.hex('#D65F27'); // 'SendSafely' orange
const webhookRetryAttempts = 3;


let {host, dropzoneId, files, email, label} = yargs(process.argv.slice(2))
	.options({
		'host': {
			describe: 'The URL to SendSafely which you would like to connect to',
			demandOption: true,
		},
		'email': {
			describe: 'The email you would like to upload these as (required to use the Secure Link)',
			demandOption: true,
			type: 'string',
		},
		'label': {
			describe: 'Value to provide to the "Form Input"',
			type: 'string',
		},
		'dropzoneId': {
			describe: 'A Dropzone ID can be obtained from the Edit Profile screen (You should see the Dropzone option on the left-hand side of the page)',
			demandOption: true,
			type: 'string',
		},
		'files': {
			describe: 'List of files to upload. Uploading a folder is not supported.',
			demandOption: true,
			array: true,
			normalize: true, // applies path normalization
		},
	})
	.usage('$0 --host=\'demo.sendsafely.com\' --dropzoneId=\'AABBCCZZYYZZ\' --email=\'example@example.com\' --label="your_package_label" --files myFile1 myFile2 /path/to/my/file/file3')
	.check(({email}) => {
		if (!new RegExp(/^.+@([\w\-]+\.)+[A-Z]{2,20}$/g, 'i').test(email)){
			throw new Error(chalkError(`Please provide a valid email: ${email}`))
		}
		return true
	})
	.check(argv => {
		
		if (argv.host.startsWith('http://')){
			throw new Error(chalkError(`Uploading using insecure protocols is not supported (${argv.host})`));
		} else if (!argv.host.startsWith('https://')) {
			argv.host = "https://" + argv.host;
		}

		try {
			argv.host = new URL(argv.host).toString();
		} catch (e){
			throw new Error(chalkError(`Unable to parse SendSafely host from '${argv.host}'.\n Please check this is correct and try again`))
		}
		return true
	})
	.check(argv => {
		for (const file of argv.files) {
			const filepath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
			if (!fs.existsSync(filepath)) {
				throw new Error(chalkError(`Path does not exist: '${filepath}'`));
			} else if (!fs.statSync(filepath).isFile()) {
				throw new Error(chalkError(`Path is not a file: '${filepath}'`));
			}
		}

		return true;
	})
	.help()
	.wrap(yargs.terminalWidth())
	.argv;


console.log(`
${safelyOrange.bold('SendSafely Dropzone Upload')} 
${safelyOrange('Host:')} "${host}"
${safelyOrange('Dropzone ID:')} "${dropzoneId}"
${safelyOrange('Files paths provided: ')}${files}
`);

const CREATE_PACKAGE_FAILED = 'create.package.failed',
	INVALID_FILE_EXTENSION = 'invalid.file.extension',
	FILES_ATTACHED = 'sendsafely.files.attached',
	FILES_UPLOADED = 'sendsafely.files.uploaded',
	FINALIZATION_ERROR = 'finalization.error',
	FILE_UPLOAD_ERROR = 'file.upload.error',
	INVALID_FILENAME = 'invalid.file.name',
	SENDSAFELY_ERROR = 'sendsafely.error',
	DUPLICATE_FILE = 'duplicate.file',
	LIMIT_EXCEEDED = 'limit.exceeded',
	PROGRESS = 'sendsafely.progress';

const bars = new Map();

// go here if it isn't working for you
// https://github.com/visionmedia/node-progress/issues/104
const progressContainer = new cliProgress.MultiBar({
	clearOnComplete: false,
	hideCursor: true,
	format: '{value}% [' + safelyOrange('{bar}') + '] : {label}',
	autopadding: true,
}, cliProgress.Presets.shades_classic);


const sendSafely = new SendSafelyDropzone(host, dropzoneId);

sendSafely.on(CREATE_PACKAGE_FAILED, error => handleError(`Error creating package${error === undefined ? '.' : `: ${error}`}
Please check your host and Dropzone ID are correct`));
sendSafely.on(FILE_UPLOAD_ERROR, error => handleError(`Error while uploading file: ${error}`));
sendSafely.on(INVALID_FILE_EXTENSION, error => handleError(`Invalid file extension: ${error}`));
sendSafely.on(INVALID_FILENAME, error => handleError(`Invalid filename: ${error.message}`));
sendSafely.on(DUPLICATE_FILE, error => handleError(`Duplicate file: ${error}`));
sendSafely.on(LIMIT_EXCEEDED, error => handleError(`Limit exceeded: ${error}`));
sendSafely.on(SENDSAFELY_ERROR, error => handleError(`SendSafely Error: ${error}`));
sendSafely.on(FINALIZATION_ERROR, error => handleError(`Error while finalizing: ${error}`));

// remember to call .stop() on its progress bar 
sendSafely.on(FILES_UPLOADED, ({fileId}) => bars.get(fileId).stop());

// Create a new progress bar
sendSafely.on(FILES_ATTACHED, initializeFileProgressBar);

// Update the progress bar for a given file
sendSafely.on(PROGRESS, updateFileProgressBar);

sendSafely.createPackage((packageId, serverSecret, packageCode, keyCode) => {
	for (const filePath of files) {
		const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
		sendSafely.encryptAndUploadFiles(packageCode, keyCode, serverSecret, [absoluteFilePath], 'NODE_API',
			(packageId, fileId, fileSize, fileName) => {
				bars.get(fileId).update(100, {label: `${fileName} ${chalkSuccess('(Done)')}`});
				bars.get(fileId).stop();

				// Once every bar is inactive (file finished uploading), finalize the package
				if ([...bars.values()].every(bar => !bar.isActive)) {
					progressContainer.stop();

					sendSafely.setUnconfirmedSender(email);
					sendSafely.finalizePackage(packageId, packageCode, keyCode,
						(url) => submitHostedDropzone(url, packageCode));
				}
		});
	}
});

async function submitHostedDropzone(secureLink, packageCode) {
	const hostedDropzoneResponse = await axios.post(`${host}/auth/json/`,
		new URLSearchParams({
			action: 'submitHostedDropzone',
			packageCode: packageCode,
			publicApiKey: dropzoneId,
			name: label,
			email: email
		}));

	const {success, data, digest, integrationUrls, error} = hostedDropzoneResponse.data;

	if (success === undefined || success !== 'true') {
		handleError(`Error while finalizing: ${error}`);
	} else if (integrationUrls !== undefined && Array.isArray(integrationUrls)) {
		for (const integrationUrl of integrationUrls) {
			for (let i = 0; i < webhookRetryAttempts; i++) {
				try {
					const response = await postWebhook(integrationUrl, digest, data, secureLink);
					if (!(response === undefined ||
						response.data.result !== undefined && response.data.result === 'error')) {
						break;
					}
				} catch (ignored) {} 

				if (i === (webhookRetryAttempts - 1)){
					await connectorFailed(integrationUrl)
				}
			}
		}
	}


	console.log(chalkSuccess(`Upload Complete, see Secure Link below`));
	console.log(secureLink);
}

async function postWebhook(integrationUrl, digest, data, secureLink) {
	return axios.post(integrationUrl,
		new URLSearchParams({
					digest: digest,
					data: data,
					secureLink: secureLink,
				}));
}

async function connectorFailed(integrationUrl, digest, data, secureLink) {
	try {
		await axios.post(`${host}/auth/json/`,
			new URLSearchParams({
				action: 'dzConnectorFailed',
				apiKey: dropzoneId,
				integrationUrl: integrationUrl,
				digest: digest,
				data: data,
				secureLink: secureLink
			}))
			
	} catch (ignored) {}
}


function handleError(message) {
	progressContainer.stop();

	for (const bar of bars.values()) {
		bar.stop();
	}

	console.error(chalkError(message));
	process.exit(1);
}

function initializeFileProgressBar({fileId, name}) {
	const bar = progressContainer.create(100, 0);
	bar.start(100, 0);

	bar.update(0, {label: `${name}`});
	bars.set(fileId, bar);
}

function updateFileProgressBar({fileId, percent}) {
	bars.get(fileId).update(parseFloat(percent.toFixed(2)));
}
