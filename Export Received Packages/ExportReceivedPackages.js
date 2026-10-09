const https = require('https');
const URL = require('url').URL;
const sjcl = require("sjcl");
const fs = require('fs');
const path = require('path');
const SendSafely = require('@sendsafely/sendsafely');
const rimraf = require("rimraf");
const datetime = require('node-datetime');

var myArgs = process.argv;

var ssHost = "https://yourcompany.sendsafely.com";
var ssApiKey = "aaabbbcccddd";
var ssApiSecret = "wwwxxxyyyzzz";

var privateKey;
var publicKeyId;
var packageCounter = 0;
var packages;
var packageInfo;
var fileCounter = 0;
var fileCount = 0;
var _sendSafely;
var currentPackage;
var baseExportPath = "export/";
var packageDirectoryName;

if (myArgs.length < 3 || (myArgs[2].toLowerCase() != "getfiles" && myArgs[2].toLowerCase() != "generatekey")) {
    console.log("You must specify either generateKey or getFiles");
} else if (myArgs[2].toLowerCase() == "generatekey") {
    _sendSafely = new SendSafely(ssHost, ssApiKey, ssApiSecret);
    generateKeyPair();
} else if (myArgs[2].toLowerCase() == "getfiles") {
    if (myArgs.length != 5) {
        console.log("You must provide a key file and key id");
    } else {
        publicKeyId = myArgs[4];
        fs.readFile(myArgs[3], "utf8", function(err, data) {
            if (err) throw err;
            privateKey = data;
        });
        _sendSafely = new SendSafely(ssHost, ssApiKey, ssApiSecret);
        _sendSafely.verifyCredentials(function(email) {
            console.log("Connected to SendSafely as user " + email);
            getReceivedPackages().then(function(res) {
                packages = res;
                console.log(packages.length + " packages were returned by the server");
                if (!fs.existsSync(baseExportPath)) {
                    fs.mkdirSync(baseExportPath);
                }
                intEvents();
                processPackages();
            });
        });

    }
}

var exportRoot = path.resolve(baseExportPath);

function getSanitizedPathName(name) {
    var nonAllowedCharacters = /[<>:"/\\|?*]/g;
    return String(name).replace(nonAllowedCharacters, "_");
}

function containsTraversalSegment(name) {
    if (!name) return false;
    var segments = String(name).split(/[\\/]/);
    if (segments.length > 1) return true; // any separator at all is disallowed
    return segments.indexOf('..') !== -1;
}

function isPathSafe(base, target) {
    var absoluteBase = path.resolve(base) + path.sep;
    var resolved = path.resolve(base, target);
    var lexicallySafe = resolved === path.resolve(base) || (resolved + path.sep).indexOf(absoluteBase) === 0;
    if (!lexicallySafe) {
        return { safe: false, resolved: resolved };
    }

    var realBase = realpathNearestExisting(path.resolve(base));
    var realParent = realpathNearestExisting(path.dirname(resolved));
    var symlinkSafe = realParent === realBase || (realParent + path.sep).indexOf(realBase + path.sep) === 0;

    return { safe: symlinkSafe, resolved: resolved };
}

/**
 * Resolves the real (symlink-following) path of `dir`, walking up to the
 * nearest existing ancestor first if `dir` itself doesn't exist yet
 * (directories are often created just before a file is written, so at check
 * time the target directory may not exist on disk).
 */
function realpathNearestExisting(dir) {
    var current = dir;
    while (!fs.existsSync(current)) {
        var parent = path.dirname(current);
        if (parent === current) break; // reached filesystem root without finding anything real
        current = parent;
    }
    return fs.realpathSync(current);
}

function abortOnTraversal(what, value, resolved) {
    console.error('[SECURITY ALERT] Blocked a path traversal attempt (' + what + ').');
    console.error('Offending value: ' + value);
    if (resolved) {
        console.error('Resolved target: ' + resolved);
    }
    process.exit(1);
}

function safeExportFilePath(relativeDir, rawFileName) {
    var sanitizedName = getSanitizedPathName(rawFileName);

    if (containsTraversalSegment(sanitizedName)) {
        abortOnTraversal('filename', rawFileName, null);
    }

    var dirCheck = isPathSafe(exportRoot, relativeDir);
    if (!dirCheck.safe) {
        abortOnTraversal('export directory', relativeDir, dirCheck.resolved);
    }

    var fileCheck = isPathSafe(exportRoot, path.join(relativeDir, sanitizedName));
    if (!fileCheck.safe) {
        abortOnTraversal('resolved file path', rawFileName, fileCheck.resolved);
    }

    return fileCheck.resolved;
}

function writeFile(fileName, data) {
    var targetPath = safeExportFilePath("_" + packageDirectoryName, fileName);

    fs.writeFile(targetPath, data, (err) => {
        if (err) {
            throw err;
        }
        console.log('File has been saved: ' + fileName);
        fileCounter++;
        if (fileCounter == fileCount) {
            var fromDirCheck = isPathSafe(exportRoot, "_" + packageDirectoryName);
            var toDirCheck = isPathSafe(exportRoot, packageDirectoryName);
            if (!fromDirCheck.safe) {
                abortOnTraversal('rename source directory', "_" + packageDirectoryName, fromDirCheck.resolved);
            }
            if (!toDirCheck.safe) {
                abortOnTraversal('rename target directory', packageDirectoryName, toDirCheck.resolved);
            }
            fs.renameSync(fromDirCheck.resolved, toDirCheck.resolved);
            proceedToNext();
        }
    });

}

function intEvents() {
    _sendSafely.on('save.file', function(data) {
        var fileName = getFilenameFromId(currentPackage, data.fileId);
        writeFile(fileName, data.file);
    });

    _sendSafely.on('sendsafely.error', function(error, errorMsg) {
        console.log("Error: " + errorMsg);
        var errorPath = safeExportFilePath("_" + packageDirectoryName, "ERROR.TXT");
        fs.writeFileSync(errorPath, "Error: " + errorMsg);
        proceedToNext();
    });
}


function processPackages() {
    fileCounter = 0;
    var packageId = packages[packageCounter].packageId;
    console.log("Looking at package " + (packageCounter + 1) + " of " + packages.length + " (" + packageId + ")");
    var dt = datetime.create(packages[packageCounter].packageUpdateTimestamp);
    var formatted = dt.format('Y-m-d');
    // packageId is server-issued (not attacker-free-text like a fileName), but it is
    // sanitized here too as defense in depth before it becomes part of a filesystem path.
    packageDirectoryName = formatted + "_" + getSanitizedPathName(packageId);

    var packageDirCheck = isPathSafe(exportRoot, packageDirectoryName);
    if (!packageDirCheck.safe) {
        abortOnTraversal('package directory', packageDirectoryName, packageDirCheck.resolved);
    }

    if (!fs.existsSync(packageDirCheck.resolved) && ! packages[packageCounter].packageStateStr.toUpperCase().includes("EXPIRED")) {

        var workingDirCheck = isPathSafe(exportRoot, "_" + packageDirectoryName);
        if (!workingDirCheck.safe) {
            abortOnTraversal('working directory', "_" + packageDirectoryName, workingDirCheck.resolved);
        }

        //Starting package, check for working directory and delete
        rimraf.sync(workingDirCheck.resolved);
        fs.mkdirSync(workingDirCheck.resolved);

        getPackageInfo(packageId).then(function(res) {
            packageInfo = res;
            currentPackage = packageInfo;
            fileCount = packageInfo.files.length;
            _sendSafely.getKeycode(privateKey, publicKeyId, packageInfo.packageId, function(keycode) {
                console.log('Decrypted keycode for ' + packageInfo.packageId);

                fileCounter = 0;
                var messageLog = packages[packageCounter].packageContainsMessage ? " and a secure message" : " and no message";
                console.log("This package has " + packageInfo.files.length + " files" + messageLog);
                if (packages[packageCounter].packageContainsMessage)
                {
                    fileCount++; //Treat the message as a file so it waits to proceed to next package
                    var checksum = createChecksum(keycode, packageInfo.packageCode);
                    getMessage(packageInfo.packageId, checksum).then(function(res) {
                        var encryptedMessage = res.message;
                        _sendSafely.decryptMessage(packageInfo.packageId, keycode, packageInfo.serverSecret, encryptedMessage, function(message) {
                            writeFile(packageInfo.packageId + ".message.txt", message);

                        });
                    });
                }

                if (packageInfo.files.length > 0) {
                    for (j = 0; j < packageInfo.files.length; j++) {
                        console.log("└ " + packageInfo.files[j].fileName);
                        _sendSafely.downloadFile(packageInfo.packageId, packageInfo.files[j].fileId, keycode);
                    }
                }
            });
        });


    } else {
        console.log("Skipping " + packageId + " (already downloaded)");
        proceedToNext();
    }
}

function proceedToNext() {
    packageCounter++;
    if (packageCounter < packages.length) {
        processPackages();
    } else {
        console.log("** FINISHED **");
    }
}


function generateKeyPair() {
    console.log("Generating new key pair...")
    _sendSafely.generateKeyPair("Node example", false, function(privateKey, publicKey) {

        console.log("New key pair generated");
        console.log("Key ID: " + publicKey.id);
        var keyFilePath = safeExportCwdFilePath(publicKey.id + ".privatekey.txt");
        fs.writeFile(keyFilePath, privateKey, (err) => {
            if (err) console.log(err);
            console.log("Private Key Written to File: " + publicKey.id + ".privatekey.txt");
        });

    });
}

function safeExportCwdFilePath(rawFileName) {
    var sanitizedName = getSanitizedPathName(rawFileName);
    if (containsTraversalSegment(sanitizedName)) {
        abortOnTraversal('filename', rawFileName, null);
    }
    var cwd = process.cwd();
    var check = isPathSafe(cwd, sanitizedName);
    if (!check.safe) {
        abortOnTraversal('resolved file path', rawFileName, check.resolved);
    }
    return check.resolved;
}

function getReceivedPackages() {
    return new Promise((resolve, reject) => {
        var items = [];
        var offset = 0;
        console.log("Getting received items...");
        function getItems(offset) {
            _sendSafely.getReceivedPackages(offset, function(results) {
                items.push(...results.packages);
                if (results.pagination.nextRowIndex) {
                    console.log("Getting more items...");
                    getItems(results.pagination.nextRowIndex);
                } else {
                    console.log("Done.");
                    resolve(items);
                }
            });
        }
        getItems(offset);
    });
}

function getPackageInfo(packageId) {
    return makeRequest("GET", "/api/v2.0/package/" + packageId + "/");
}

function getMessage(packageId, checksum) {
    return makeRequest("GET", "/api/v2.0/package/" + packageId + "/message/" + checksum);
}


function getFilenameFromId(packageInfo, fileId) {
    for (j = 0; j < packageInfo.files.length; j++) {
        if (packageInfo.files[j].fileId == fileId) {
            return packageInfo.files[j].fileName;
        }
    }
}

function makeRequest(method, path, messageData) {
    return new Promise(function(resolve) {
        method = method.toUpperCase();
        var url = new URL(ssHost + path);
        var timestamp = new Date().toISOString().substr(0, 19) + "+0000"; //2014-01-14T22:24:00+0000;

        var messageString = ssApiKey + path + timestamp;
        if (messageData != "" && messageData != null) {
            messageString += messageData;
        }
        var signature = signMessage(messageString);
        var responseData = "";

        const headers = {
            'Content-Type': 'application/json',
            'ss-api-key': ssApiKey,
            'ss-request-timestamp': timestamp,
            'ss-request-signature': signature,
            'ss-request-api': 'NODE_API'
        };

        var options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: headers,
            method: method,
        };

        var req = https.request(options, function(res) {
            res.on('data', function(chunk) {
                responseData += chunk;
            });

            res.on('end', function() {
                resolve(JSON.parse(responseData));
            });
        });

        if (method === 'PUT' || method === 'POST') {
            req.write(JSON.stringify(messageData));
        }

        req.end();
    });
}

function signMessage(messageString) {
    var hmacFunction = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(ssApiSecret), sjcl.hash.sha256); // Key, Hash
    return sjcl.codec.hex.fromBits(hmacFunction.encrypt(messageString));
}

function createChecksum(keyCode, packageCode) {
    keyCode = sjcl.codec.utf8String.toBits(urlSafeBase64(keyCode));
    packageCode = sjcl.codec.utf8String.toBits(urlSafeBase64(packageCode));
    return sjcl.codec.hex.fromBits(sjcl.misc.pbkdf2(keyCode, packageCode, 1024, 256));
}



function urlSafeBase64(base64String) {
    if( typeof base64String == "string"){
        base64String = base64String.replace(/\+/g, '-');
        base64String = base64String.replace(/\//g, '_');
        base64String = base64String.replace(/=/g, '');
        return base64String;
    }
}