/* START USER DEFINED PARAMETERS */
var ssHost = "https://yourcompany.sendsafely.com";
var ssApiKey = "INSERT_API_KEY_HERE";
var ssApiSecret = "INSERT_API_SECRET_HERE";
/* END USER DEFINED PARAMETERS */

const sjcl = require("sjcl");
const requestSync = require('sync-request');
const fs = require('fs');
const SendSafely = require('@sendsafely/sendsafely');
const path = require('path');
const {argv} = require('yargs')

var myArgs = process.argv;

//Internal global variables
var keyCode;
var packageInformation;
var filesToUpload = [];
var fileDoneCounter = 0;
var fileSkipCounter = 0;
var dirCounter = 0;
var wsDirectoryMap = {};
var wsFileMap = {};
var localFileMap = {};
var wsDirectoryContentMap = {};
var localRoot;
var rl = require('readline');
var emailAddresses;
var localFileCounter = 0;
var workspaceLink = argv.secureLink;

if (argv.create && !argv.name) {
    console.log("\nError: --create option requires also passing in the --name flag\n");
    return;
}

var sendSafely = new SendSafely(ssHost, ssApiKey, ssApiSecret);
initEvents();

if (argv.collaborators) {
    emailAddresses = extractEmails(argv.collaborators.toString());
    if (emailAddresses != null && emailAddresses.length > 99) {
        console.log("\nError: There is a maximum of 99 recipients\n");
        return;
    } else if (emailAddresses == null) {
        console.log("\nError: The --collaborator flag did not include any valid email addresses\n");
        return;
    }
    if (!argv.create && !argv.secureLink) {
        console.log("\nError: The --collaborator option requires the --secureLink option when not being used with --create \n");
        return;
    }
}

if (argv.upload) {
    localRoot = path.resolve(argv.upload).replace(/\\/g, "/");

    if (!argv.create && !argv.secureLink) {
        console.log("\nError: The --upload option requires the --secureLink option when not being used with --create \n");
        return;
    }
}

if (!argv.upload && !argv.create && !argv.collaborators) {
    printUsage();
    return;
}

//Start running
console.log("\nConnecting to SendSafely");
sendSafely.verifyCredentials(function(email) {

    console.log("Connected as user " + email + "\n");

    if (argv.create) {
        createWorkspace(function() {
            if (argv.collaborators) {
                addCollaborators(function() {
                    if (argv.upload) {
                        uploadFiles();
                    } else {
                        console.log("\nDone\n");
                    }
                })
            } else if (argv.upload) {
                uploadFiles();
            } else {
                console.log("\nDone\n");
            }
        });
    } else if (argv.collaborators) {
        addCollaborators(function() {
            if (argv.upload) {
                uploadFiles();
            } else {
                console.log("\nDone\n");
            }
        });
    } else if (argv.upload) {
        uploadFiles();
    }

});

function addCollaborators(done) {
    sendSafely.packageInformationFromLink(workspaceLink, function(pInfo) {
        packageInformation = pInfo;
        console.log("Adding collaborators to Workspace " + pInfo.label + " (#" + pInfo.packageId + ")");
        keyCode = workspaceLink.split('#')[1].substring(8);
        sendSafely.addRecipients(packageInformation.packageId, emailAddresses, keyCode, function(data) {
            for (var i = 0; i < data.recipients.length; i++) {
                var obj = data.recipients[i];
                console.log(obj.email + " - " + obj.response);
            }
            console.log();
            done();
        });
    });
}

function uploadFiles() {
    getLocalFiles(localRoot, function(err, results) {
        if (err) throw err;
        //console.log(results);
        filesToUpload = results;

        if (!filesToUpload.length > 0) {
            console.log("\nError: No files found in " + localRoot + "\n");
            return;
        }

        sendSafely.packageInformationFromLink(workspaceLink, function(pInfo) {

            packageInformation = pInfo;
            keyCode = workspaceLink.split('#')[1].substring(8);
            console.log("Adding files to Workspace " + pInfo.label + " (#" + pInfo.packageId + ")");
            wsDirectoryMap["/"] = packageInformation.rootDirectoryId;

            var confirm = "\nYou are about to upload " + filesToUpload.length + " files";
            if (dirCounter > 0) {
                confirm += " from " + dirCounter + " local folders";
            }
            confirm += " into SendSafely Workspace \"" + packageInformation.label + "\".\n\nAre you sure you want to continue?\n\nPress ENTER to continue or CTRL+C to abort.";
            ask(confirm, function(answer) {
                populateWorkspaceMap("/", packageInformation.rootDirectoryId);
                processFileList(function() {
                    console.log("\nFinished. " + fileDoneCounter + " files were uploaded and " + fileSkipCounter + " files were skipped (already in workspace)\n");
                });
            });
        })
    });
}

function createWorkspace(done) {
    sendSafely.createWorkspace(function(packageId, serverSecret, packageCode, keyCode) {
        sendSafely.updatePackage(packageId, {
            label: argv.name
        }, function() {
            console.log("\nNew Workspace Created. The following link must be used to access the workspace:");
            workspaceLink = ssHost + "/receive/?packageCode=" + packageCode + "&thread=" + packageId + "#keycode=" + keyCode + "\n"
            console.log(workspaceLink);
            done();
        }, function() {
            console.log("ERROR");
        });
    });
}


var sendSafely = new SendSafely(ssHost, ssApiKey, ssApiSecret);
initEvents();

function printUsage() {
    console.log("\nUsage syntax:");
    console.log("\n  Create a new workspace:");
    console.log("  " + path.basename(myArgs[1]) + " --create --name=\"workspace_name\"");
    console.log("\n  Add collaborators to a workspace:");
    console.log("  " + path.basename(myArgs[1]) + " --collaborators=\"list_of_email_addresses\" --secureLink=\"workspace_link\"");
    console.log("\n  Upload local file/folders to a workspace:");
    console.log("  " + path.basename(myArgs[1]) + " --upload=\"path_to_files\" --secureLink=\"workspace_link\"");
    console.log("\n  Do all three operations at once:");
    console.log("  " + path.basename(myArgs[1]) + " --create --name=\"workspace_name\" --collaborators=\"list_of_email_addresses\" --upload=\"path_to_files\"\n");
    return;
}

function extractEmails(text) {
    return text.match(/([a-zA-Z0-9.!#$%&'*+\-\/=?^_`{|}~+_-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
}

function ask(question, callback) {
    if (!argv.noprompt) {
        var r = rl.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        r.question(question + '\n(Tip: Use the --noprompt option next time to skip this prompt)\n', function(answer) {
            r.close();
            callback(null, answer);
        });
    } else {
        callback(null, true);
    }
}

function getLocalFiles(dir, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
        if (err) return done(err);
        var i = 0;
        (function next() {
            var file = list[i++];
            if (!file) return done(null, results);
            file = path.resolve(dir, file);
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    //New dir
                    //console.log("NEW DIR: " + file);
                    dirCounter++;
                    getLocalFiles(file, function(err, res) {
                        results = results.concat(res);
                        next();
                    });
                } else {
                    //New file
                    //console.log("NEW FILE: " + file);
                    results.push(file.replace(/\\/g, "/"));
                    next();
                }
            });
        })();
    });
};

function initEvents() {
    sendSafely.on('sendsafely.error', function(error, errorMsg) {
        console.log("ERROR: " + error + " " + errorMsg)
    });
}

function processFileList(done) {
    var relativeFile = filesToUpload[localFileCounter].replace(localRoot, "");
    //console.log("Processing file " + relativeFile);
    var relativeDir = path.dirname(relativeFile);
    if (!doesPathExist(relativeDir) || (doesPathExist(relativeDir) && !(relativeFile in wsFileMap))) {
        console.log("Uploading file " + relativeFile);

        //console.log(relativeDir);
        getDirectoryId(relativeDir, function(id) {
            //console.log("Using directory id " + id);

            fs.readFile(filesToUpload[localFileCounter], function(err, data) {
                if (err) {
                    throw err
                }
                var file = {
                    size: data.length,
                    name: path.basename(filesToUpload[localFileCounter]),
                    data: data
                };
                //console.log("Uploading file...");

                sendSafely.encryptAndUploadFilesToDirectory(packageInformation.packageId, keyCode, packageInformation.serverSecret, [file], "js", id, function(packageId, fileId, fileSize, fileName) {
                    localFileCounter++;
                    //console.log("Upload Complete - " + fileName);
                    fileDoneCounter++;
                    if (localFileCounter == filesToUpload.length) {
                        //console.log("All Uploads Complete");
                        done();
                    } else {
                        processFileList(done);
                    }
                });
            })

        });
    } else {
        console.log("Skipping file " + relativeFile + " (already in Workspace)");
        localFileCounter++
        fileSkipCounter++;
        if (localFileCounter == filesToUpload.length) {
            //console.log("All Uploads Complete .. Done");
            done();
        } else {
            processFileList(done);
        }

    }
}

function populateDirectoryMap(subDirs, directories, fullParentName) {
    for (var i = 0; i < directories.length; i++) {
        subDirs[directories[i].name] = directories[i].directoryId;
        wsDirectoryMap[fullParentName + directories[i].name] = directories[i].directoryId;
        //console.log("Added " + fullParentName + directories[i].name + " to wsDirectoryMap");
    }
}

function populateFileMap(files, fullParentName) {
    for (var i = 0; i < files.length; i++) {
        //fileList[files[i].name] = files[i].fileUploaded;
        //console.log("Added " + fullParentName + files[i].fileName + " to file map");
        wsFileMap[fullParentName + files[i].fileName] = files[i].fileUploaded;
    }
}

function populateWorkspaceMap(name, id) {
    var getDirectoryUrl = "/api/v2.0/package/" + packageInformation.packageId + "/directory/" + id;
    var packageResponse = makeSSRequestSync("GET", getDirectoryUrl);

    var directories = JSON.parse(packageResponse.getBody('utf8')).subDirectories;
    //console.log(directories);
    var subDirs = {};
    var fullParentName = name;
    if (!fullParentName.endsWith("/")) {
        fullParentName += "/";
    }
    populateDirectoryMap(subDirs, directories, fullParentName);
    var lastPageSize = directories.length;
    var pageNumber = 0;
    while (lastPageSize == 100) {
        pageNumber++;
        var offset = pageNumber * 100;
        //console.log("Need another page");
        var packageResponseFollowUp = makeSSRequestSync("GET", getDirectoryUrl + "?directoryIndex=" + offset);
        directories = JSON.parse(packageResponseFollowUp.getBody('utf8')).subDirectories;
        populateDirectoryMap(subDirs, directories, fullParentName);
        lastPageSize = directories.length;
    }

    //console.log("Added " + name + " to wsDirectoryContentMap");
    wsDirectoryContentMap[name] = subDirs;

    var files = JSON.parse(packageResponse.getBody('utf8')).files;
    populateFileMap(files, fullParentName);
    lastPageSize = files.length;
    pageNumber = 0;
    while (lastPageSize == 100) {
        pageNumber++;
        var offset = pageNumber * 100;
        //console.log("Needs another page");
        var packageResponseFollowUp = makeSSRequestSync("GET", getDirectoryUrl + "?fileIndex=" + offset);
        files = JSON.parse(packageResponseFollowUp.getBody('utf8')).files;
        populateFileMap(files, fullParentName);
        lastPageSize = files.length;
    }
}

function doesPathExist(pathValue) {
    if (pathValue == "/") {
        return true;
    } else {

        var pathParts = pathValue.split("/");
        var testParts = [];
        testParts.push(pathParts[0]); //This is always blank
        for (var i = 1; i < pathParts.length; i++) {
            var parent = "/";

            if (testParts.length > 1) {
                parent = testParts.join("/");
            }
            var parentMap = wsDirectoryContentMap[parent];
            testParts.push(pathParts[i]);
            var dirName = testParts.join("/");
            if (pathParts[i] in parentMap) {
                //Fetch the child if not already present
                if (dirName in wsDirectoryContentMap) {
                    //console.log(wsDirectoryContentMap[dirName]);
                } else {
                    populateWorkspaceMap(dirName, parentMap[pathParts[i]]);
                }
                //Keep going
            } else {
                return false;
            }

        }
        return true;
    }
}


function getDirectoryId(dirName, callback) {
    if (dirName in wsDirectoryMap) {
        callback(wsDirectoryMap[dirName]);
    } else {
        //console.log("Directory does not exist...creating");
        var dirParts = dirName.split("/");
        //minus 2 because we pop one immediately and the last one is blank (due to leading "/")
        var initialLength = dirParts.length - 2;
        var i = 0
        for (0; i < initialLength; i++) {
            dirParts.pop();
            lookupName = dirParts.join("/");
            if (lookupName in wsDirectoryMap) {
                break;
            }
        }
        //If we make it here we are done
        var startingPoint = "/";
        if (i != initialLength) {
            startingPoint = dirParts.join("/");
        }
        //console.log("Done searching cache. Closest dir is: " + startingPoint);

        var newFolders = dirName.replace(startingPoint, "").split("/");
        if (newFolders[0] == "") {
            newFolders.shift();
        }
        createNewPaths(startingPoint, newFolders, function(newId) {
            callback(newId);
        });
    }
}

function createNewPaths(startingPoint, arr, done) {
    startingId = wsDirectoryMap[startingPoint];
    sendSafely.createSubdirectory(packageInformation.packageId, arr[0], startingId, function(res) {
        if (!startingPoint.endsWith("/")) {
            startingPoint += "/";
        }
        var newDirName = startingPoint + arr[0];
        wsDirectoryMap[newDirName] = res.responseJSON.message;
        if (arr.length > 1) {
            arr.shift();
            createNewPaths(newDirName, arr, done);
        } else {
            done(res.responseJSON.message);
        }
    })
}


function makeSSRequestSync(method, url, messageData) {

    var timestamp = new Date().toISOString().substr(0, 19) + "+0000";

    var messageString = ssApiKey + url.split("?")[0] + timestamp;
    if (messageData != "" && messageData != null) {
        messageString += messageData;
    }
    var signature = signMessage(messageString);
    var requestOptions = {};
    var requestHeaders = {
        'ss-api-key': ssApiKey,
        'ss-request-timestamp': timestamp,
        'ss-request-signature': signature,
        'ss-request-api': 'NODE_API',
        'Content-Type': 'application/json'
    };
    requestOptions["headers"] = requestHeaders;
    if (messageData) {
        requestOptions["body"] = messageData;
    }
    var res = requestSync(method, ssHost + url, requestOptions);
    //console.log(res.headers['content-type']);
    if (res.getBody("UTF-8").includes("AUTHENTICATION_FAILED")) {
        throw new Error(res.getBody("UTF-8"));
    } else if (!res.headers['content-type'].includes("application/json")) {
        throw new Error("Incorrect response type. Check your SendSafely hostname");
    } else {
        return res;
    }
}

function signMessage(messageString) {
    var hmacFunction = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(ssApiSecret), sjcl.hash.sha256); // Key, Hash
    return sjcl.codec.hex.fromBits(hmacFunction.encrypt(messageString));
}