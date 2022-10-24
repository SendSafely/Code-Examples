const axiosRequest = require("./axiosRequest");

/**
 * Adds _ALLDIRS property to each workspace (ws) , which contains every directory (dir) in ws,
 * including root directory ('/'). To each dir in _ALLDIRS, two custom
 * properties are added, _ALLSUBDIRS (all subdirectories in dir, via pagination) and
 * _ALLFILES (all files in dir, via pagination) */
const decorateWorkSpacesWithAllDirs = async function(config = {}) {
    let decoratedWorkspaces = [];
    const {listOfWorkspaces, credentials} = config;
    for(let i = 0; i < listOfWorkspaces.length; i += 1){
        try {
            const ws = await getPackageInformation({packageId: listOfWorkspaces[i].packageId, credentials});
            const {packageId, rootDirectoryId} = ws;

            ws._ALLDIRS  = await getAllDirectoriesRecursively({packageId, directoryId: rootDirectoryId, wsName: ws.label, credentials});

            decoratedWorkspaces.push(ws);
        } catch(e) {
            console.error(`Error decorating ws with "_ALLDIRS" property: `, e);
            throw e;
        }

    }
    return decoratedWorkspaces;
};

const deleteFileFromDirWs = async function(config = {}) {
    const {file, dir, ws, daysOver, MaxWorkspaceFileAge, credentials, dryRun} = config;
    const {fileId, fileName, fileUploaded} = file;
    const {directoryId, directoryName} = dir;
    const {packageId, packageDescriptor} = ws;

    try {

        if(dryRun) {
            console.log(`DRYRUN: Deleting "${fileName}" from Workspace "${packageDescriptor}" Directory "${directoryName}", because it is ${daysOver} days(s) older than max of ${MaxWorkspaceFileAge} day(s). 
        (packageId: ${packageId}, directoryId: ${directoryId}, fileId: ${fileId}, fileUploaded: ${fileUploaded})...`);
        } else {
            console.log(`Deleting "${fileName}" from Workspace "${packageDescriptor}" Directory "${directoryName}", because it is ${daysOver} days(s) older than max of ${MaxWorkspaceFileAge} day(s). 
        (packageId: ${packageId}, directoryId: ${directoryId}, fileId: ${fileId}, fileUploaded: ${fileUploaded})...`);

            const {data} = await axiosRequest(credentials, "DELETE", `/api/v2.0/package/${packageId}/directory/${directoryId}/file/${fileId}/`);

            if(data.response === "SUCCESS") {
                console.log(`Success deleting "${fileName}" from Workspace "${packageDescriptor}" Directory "${directoryName}", because it is ${daysOver} days(s) old, and max life is ${MaxWorkspaceFileAge} day(s).`);
            } else {
                console.log(`Failure deleting "${fileName}" from Workspace "${packageDescriptor}" Directory "${directoryName}", because it is ${daysOver} days(s) old, and max life is ${MaxWorkspaceFileAge} day(s)! `, data.response);
                throw new Error(`Failure deleting "${fileName}" from Workspace "${packageDescriptor}" Directory "${directoryName}", because it is ${daysOver} days(s) old, and max life is ${MaxWorkspaceFileAge} day(s)! data.response: ${data.response}`);
            }
        }

    } catch(e) {
        console.log(`Error deleting "${fileName}" from Workspace "${packageDescriptor}" Directory "${directoryName}", because it is ${daysOver} days(s) old, and max life is ${MaxWorkspaceFileAge} day(s): `, e);
        throw e;
    }
};

const getAllPackages = async function (config = {}) {
    let allPackages = [];
    const {status, credentials} = config;
    const body = `{"status":"${status}"}`;
    const pageSize = 100;
    const initialRowIndex = 0;

    try {
        const data = await getOrgPackagesByPage({initialRowIndex, pageSize, body, credentials});

        if(data.response === "SUCCESS") {
            let isThereMorePages = !!data.pagination.nextRowIndex;
            let nextRowIndex = parseInt(data.pagination.nextRowIndex, 10);
            allPackages = allPackages.concat(data.packages);

            while(isThereMorePages) {
                const data = await getOrgPackagesByPage({initialRowIndex:nextRowIndex, pageSize, body, credentials});
                allPackages = allPackages.concat(data.packages);
                isThereMorePages = !!data.pagination.nextRowIndex;
                if(isThereMorePages) {
                    nextRowIndex = parseInt(data.pagination.nextRowIndex, 10);
                }
            }

        }
    } catch(e) {
        console.log(`error getting all packages: `, e);
        throw e;
    }

    return allPackages;
};

const getAllDirectoriesRecursively = async function (config = {}) {
    let dirs = [];
    const {packageId, directoryId, wsName, credentials} = config;

    try {

        const {data} = await axiosRequest(credentials, "GET", `/api/v2.0/package/${packageId}/directory/${directoryId}`);

        if(data.response === "SUCCESS") {
            //console.log(`Success fetching directory data for directory "${directoryId}", in packageId "${packageId}".`);
            let currentDir = data;
            // THIS list is currently only ONE page
            const {subDirectories, files, directoryName} = currentDir;

            dirs.push(currentDir);

            if (subDirectories !== undefined && subDirectories.length) {
                const directoryIndex = 0;
                console.log(`Checking if additional subdirectories present, for directory "${directoryId}", in workspace "${wsName}"`);
                // The full list of all subdirectories, accounting for pagination
                currentDir._ALLSUBDIRS = await getAllSubDirsInDirByPage({packageId, directoryId, directoryName, directoryIndex, subDirectories, credentials});
                const numSubDirs = currentDir._ALLSUBDIRS.length;
                for(let i = 0; i < numSubDirs; i += 1) {
                    console.log(`Checking subdirectory (${i + 1} out of ${numSubDirs}) for nested directories,  for directory "${directoryName}", in workspace "${wsName}"...`);
                    const nextDirectory = currentDir._ALLSUBDIRS[i];
                    dirs = dirs.concat(await getAllDirectoriesRecursively({packageId, directoryId: nextDirectory.directoryId, wsName, credentials}));
                }
            } else {
                currentDir._ALLSUBDIRS = [];
            }

            if (files !== undefined && files.length) {
                const fileIndex = 0;
                console.log(`Checking if additional files present, for directory "${directoryId}", in workspace "${wsName}"`);
                // The full list of all files, accounting for pagination
                currentDir._ALLFILES = await getAllFilesInDirByPage({packageId, directoryId, directoryName, files, fileIndex, credentials});
            } else {
                currentDir._ALLFILES = [];
            }

            return dirs;
        } else {
            console.log(`Failure fetching directory data for directory "${directoryId}", in workspace "${wsName}"`);
            throw new Error(`Failure fetching directory data for directory "${directoryId}", in workspace "${wsName}"`);
        }

    } catch(e){
        console.log(`Error fetching directory data for directory "${directoryId}", in workspace "${wsName}": `, e);
        throw e;
    }
};

const getAllFilesInDirByPage = async function(config = {}) {
    const {packageId, directoryId, directoryName, files, fileIndex, credentials} = config;
    const maxNumFilesPerPage = 100;
    const nextIndex = fileIndex + maxNumFilesPerPage;
    if(files.length === 100) {
        try {
            console.log(`Fetching additional files, from index: ${fileIndex} – ${nextIndex}, for directory "${directoryName}"...`);
            const {data} = await axiosRequest(credentials,
                "GET", `/api/v2.0/package/${packageId}/directory/${directoryId}`,
                {params: {fileIndex: nextIndex}});

            if(data.response === "SUCCESS") {
                console.log(`Success fetching additional files, from index: ${fileIndex} – ${nextIndex}, for directory "${directoryName}".`);
                let moreFiles = data.files;
                if(moreFiles.length === 100) {
                    return files.concat(
                        await getAllFilesInDirByPage({packageId, directoryId, directoryName, files: moreFiles, fileIndex: nextIndex, credentials})
                    );
                }
                return files.concat(moreFiles);
            } else {
                console.log(`Failure fetching additional files, from index: ${fileIndex} – ${nextIndex}, for directory "${directoryName}"!`, data.response);
                throw new Error(`Failure fetching additional files, from index: ${fileIndex} – ${nextIndex}, for directory "${directoryName}"! data.response: ${data.response}`);
            }

        } catch(e) {
            console.log(`Error fetching additional files, from index: ${fileIndex} – ${nextIndex}, for directory "${directoryId}": `, e);
            throw e;
        }
    }

    return files;
};

const getAllSubDirsInDirByPage = async function(config = {}) {
    const {packageId, directoryId, directoryName, subDirectories, directoryIndex, credentials} = config;
    const maxNumFilesPerPage = 100;
    const nextIndex = directoryIndex + maxNumFilesPerPage;

    if(subDirectories.length === 100) {
        try {
            console.log(`Fetching additional sub-directories, from index: ${directoryIndex} – ${nextIndex}, for directory "${directoryName}"...`);
            const {data} = await axiosRequest(credentials,
                "GET", `/api/v2.0/package/${packageId}/directory/${directoryId}`,
                {params: {directoryIndex: nextIndex}});

            if(data.response === "SUCCESS") {
                console.log(`Success fetching additional sub-directories, from index: ${directoryIndex} – ${nextIndex}, for directory "${directoryName}".`);
                let moreSubDirectories = data.subDirectories;
                if(moreSubDirectories.length === 100) {
                    return subDirectories.concat(moreSubDirectories,
                        await getAllSubDirsInDirByPage({packageId, directoryId, directoryName, subDirectories: moreSubDirectories, directoryIndex: nextIndex, credentials})
                    );
                }
                return subDirectories.concat(moreSubDirectories);
            } else {
                console.log(`Failure fetching additional sub-directories, from index: ${directoryIndex} – ${nextIndex}, for directory "${directoryName}"!`);
                throw new Error(`Failure fetching additional sub-directories, from index: ${directoryIndex} – ${nextIndex}, for directory "${directoryName}"!`);
            }

        } catch(e) {
            console.log(`Error fetching additional sub-directories, from index: ${directoryIndex} – ${nextIndex}, for directory "${directoryName}": `, e);
            throw e;
        }
    }

    return subDirectories;
};

const getCountOfPackageTypes = function (packageList) {
    let transferPackages = 0;
    let dropzonePackages = 0;
    let workspacePackages = 0;
    for(let i = 0; i < packageList.length; i++) {
        if(packageList[i].isDropzonePackage === true) {
            dropzonePackages += 1;
        } else if(packageList[i].packageIsVdr === true) {
            workspacePackages += 1;
        } else {
            // Confirm that there is not more to this, e.g. special flag for transfer packages
            transferPackages += 1;
        }
    }
    return {transferPackages, dropzonePackages, workspacePackages};
};

const getDropzonePackages = function(listOfPackages) {
    return listOfPackages.filter(p => p.isDropzonePackage === true);
};

const getFileAgeInDays = function(file) {
    const now = (new Date()).getTime();
    const fileCreated = (new Date(file.fileUploaded)).getTime();
    const msInDays = 1000 * 60 * 60 * 24;
    return Math.round((now - fileCreated)/msInDays);
};

const getOrgPackagesByPage = async function( config = {}){
    const {initialRowIndex= 0, pageSize = 100, body = {}, credentials} = config;
    const startIndex = initialRowIndex + 1;
    const endIndex = startIndex + pageSize;

    try {
        console.log(`Fetching records ${startIndex} – ${endIndex}...`);
        // Note: 'packageLife' is property name when packages returned here, but 'life' when /api/v2.0/package/ is queried
        const {data} = await axiosRequest(credentials, "POST", "/api/v2.0/package/organization/search/", {body, rowIndex: initialRowIndex, pageSize});
        if(data.response === "SUCCESS") {
            console.log(`Success fetching records ${startIndex} – ${endIndex}.`);
        } else {
            console.log(`Failure fetching records ${startIndex} – ${endIndex}! `, data.response);
            throw new Error(`Failure fetching records ${startIndex} – ${endIndex}! data.response: ${data.response}`);
        }
        return data;
    } catch(e) {
        console.log(`Error fetching records ${startIndex} – ${endIndex}: `, e);
        throw e;
    }
}

const getPackageInformation = async function(config = {}) {
    const {packageId, credentials} = config;
    try {
        console.log(`Getting package information for package id ${packageId}...`);
        const {data} = await axiosRequest(credentials, "GET", `/api/v2.0/package/${packageId}`);
        if(data.response === "SUCCESS") {
            console.log(`Success getting package information for package id ${packageId}.`);
        } else {
            console.log(`Failure getting package information for package id ${packageId}! `, data.response);
            throw new Error(`Failure getting package information for package id ${packageId}! data.response: ${data.response}`);
        }
        return data;
    } catch(e) {
        console.log(`Error getting information for package id ${packageId}: `, e);
        throw e;
    }
};

const getPackagesInvalidExpiry = function(listOfPackages, expiryValue) {
    return listOfPackages.filter(p => p.packageLife > expiryValue);
};

const getTotalNumAllWsFiles = function (wsList) {
    let totalNumAllWsFiles = 0;
    try {
        wsList.forEach(ws => {
            ws._ALLDIRS.forEach(dir => {
                totalNumAllWsFiles += dir._ALLFILES.length;
            });
        });
    } catch(e) {
        console.error(`Error accessing expected "file" property on dir: `, e);
        throw e;
    }
    return totalNumAllWsFiles;
};

const getWorkspacePackages = function(listOfPackages) {
    return listOfPackages.filter(p => p.packageIsVdr === true);
};

const setExpiryOnPackages = async function(config = {}) {
    const {listOfPackages, expiryValue, credentials, dryRun} = config;
    const body = `{"life": "${expiryValue}"}`;
    let updatedPackages = [];
    let pkg = {};
    try {
        for(let i = 0; i < listOfPackages.length; i += 1) {
            pkg = listOfPackages[i];
            if(dryRun) {
                console.log(`DRYRUN: Updating (dropzone) package id "${pkg.packageId}" expiration from ${pkg.packageLife} days to ${expiryValue} days...`);
            } else {
                console.log(`Updating (dropzone) package id "${pkg.packageId}" expiration from ${pkg.packageLife} days to ${expiryValue} days...`);
                const {data} = await axiosRequest(credentials, "POST", `/api/v2.0/package/${pkg.packageId}/`, {body, rowIndex: 0, pageSize: 0});
                if(data.response === "SUCCESS") {
                    updatedPackages.push(listOfPackages[i]);
                    console.log(`Success updating (dropzone) package id "${pkg.packageId}" expiration from ${pkg.packageLife} days to ${expiryValue} days.`);
                } else {
                    console.log(`Failure updating (dropzone) package id "${pkg.packageId}" expiration from ${pkg.packageLife} days to ${expiryValue} days! `, data.response);
                    throw new Error(`Failure updating (dropzone) package id "${pkg.packageId}" expiration from ${pkg.packageLife} days to ${expiryValue} days! data.response: ${data.response}`);

                }
            }
        }
        return updatedPackages;
    } catch(e) {
        console.log(`Error updating (dropzone) package id "${pkg.packageId}" expiration from ${pkg.packageLife} days to ${expiryValue} days: `, e);
        throw e;
    }

};

module.exports = {
    decorateWorkSpacesWithAllDirs,
    deleteFileFromDirWs,
    getAllPackages,
    getAllFilesInDirByPage,
    getCountOfPackageTypes,
    getDropzonePackages,
    getFileAgeInDays,
    getPackagesInvalidExpiry,
    getTotalNumAllWsFiles,
    getWorkspacePackages,
    setExpiryOnPackages
};


