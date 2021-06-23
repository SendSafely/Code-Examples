/* START USER DEFINED PARAMETERS */

var ssHost = "https://yourcompany.sendsafely.com";
var ssApiKey = "INSERT_API_KEY_HERE";
var ssApiSecret = "INSERT_API_SECRET_HERE";
var workspaceLink = "https://yourcompany.sendsafely.com/receive/?packageCode=XXXX#keycode=YYYY";
var expirationMinutes = 2880; // 60 * 24 * 2 days

/* END USER DEFINED PARAMETERS */

const fs = require('fs');
const SendSafely = require('@sendsafely/sendsafely');
const sjcl = require("sjcl");
const moment = require('moment');

//Internal global variables 
var packageId;
var keyCode;
var fileCounter = 0;
var packageInformation;
var filesToUpload = [];
var fileArray = [];
var sendSafely = new SendSafely(ssHost, ssApiKey, ssApiSecret);

//Grab command line args
var args = process.argv.slice(2);
if (args.length != 1)
{
	console.log("File name to upload is required");
	return;
}
else
{
	filesToUpload.push(args[0]);
}

//Start running
sendSafely.verifyCredentials(function(email) {
    initEvents();
    console.log("Connected to SendSafely as user " + email);
	loadFiles();
});

function initEvents() {
    sendSafely.on('sendsafely.error', function(error, errorMsg) {
        console.log("ERROR: " + error + " " + errorMsg)
    });
}

function loadFiles() {
    if (fileArray.length == filesToUpload.length) {
        getPackage();
    } else {
        console.log("Reading file " + filesToUpload[fileArray.length]);
        fs.readFile(filesToUpload[fileArray.length], function(err, data) {
            if (err) {
                throw err
            }
            var file = {
                size: data.length,
                name: filesToUpload[fileArray.length],
                data: data
            };
            fileArray.push(file);
            loadFiles();
        })
    }
}

function getPackage() {
    sendSafely.packageInformationFromLink(workspaceLink, function(pInfo) {
        packageInformation = pInfo;
		keyCode = workspaceLink.split('#')[1].substring(8);
        console.log("Loaded package ID# " + packageInformation.packageId);
		console.log(packageInformation.files.length + " existing files");
		checkFiles();
    })
}

function checkFiles()
{
	if (fileCounter < packageInformation.files.length)
	{	
		fileCounter++;
		var now = moment(new Date());
		var fileTime = moment(new Date(packageInformation.files[fileCounter-1].fileUploaded + " GMT"));
		var age = now.diff(fileTime, "minutes");
		console.log(packageInformation.files[fileCounter-1].fileName + " is " + age + " minutes old");
		if (age >= expirationMinutes)
		{
			console.log("Deleting " + packageInformation.files[fileCounter-1].fileName);
			sendSafely.deleteFile(packageInformation.packageId, packageInformation.files[fileCounter-1].fileId, function() { 
				console.log("File has been deleted");
				checkFiles();
			});				
		}
		else
		{
			console.log("Keeping " + packageInformation.files[fileCounter-1].fileName);
			checkFiles();
		}
	}
	else
	{
		fileCounter = 0;
		console.log("Adding files");
		addFile();
	}
}

function addFile() {
	if (fileArray.length > 0)
	{
		sendSafely.encryptAndUploadFiles(packageInformation.packageId, keyCode, packageInformation.serverSecret, fileArray, "js", function(packageId, fileId, fileSize, fileName) {
			fileCounter++;
			console.log("Upload Complete - File " + fileCounter + " - " + fileName);
			if (fileCounter == filesToUpload.length) {
				console.log("All Uploads Complete .. Done");
			}
		});
	}
	else
	{
		console.log("No files to add ... Done");
	}
}
