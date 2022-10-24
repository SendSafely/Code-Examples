
const {
    decorateWorkSpacesWithAllDirs,
    deleteFileFromDirWs,
    getAllPackages,
    getCountOfPackageTypes,
    getDropzonePackages,
    getFileAgeInDays,
    getPackagesInvalidExpiry,
    getTotalNumAllWsFiles,
    getWorkspacePackages,
    setExpiryOnPackages,
} = require("./utils/helpers");


exports.app = async ({MaxDropzonePackageLife = 90, MaxWorkspaceFileAge = 90, packageStatus = "ACTIVE", dryRun = true, credentials}) => {

    console.log("MaxDropzonePackageLife:" + MaxDropzonePackageLife + " MaxWorkspaceFileAge:" + MaxWorkspaceFileAge + " dryRun:" + dryRun);

    const allActiveOrgPackages = await getAllPackages({status: packageStatus, credentials});

    console.log(`Count of all packages in org: `, getCountOfPackageTypes(allActiveOrgPackages));

    const activeDropzonePackagesAll = getDropzonePackages(allActiveOrgPackages);
    const dropzonePackagesInvalidExpiry = getPackagesInvalidExpiry(activeDropzonePackagesAll, MaxDropzonePackageLife);

    if(dropzonePackagesInvalidExpiry.length) {
        await setExpiryOnPackages({
            listOfPackages:dropzonePackagesInvalidExpiry,
            expiryValue: MaxDropzonePackageLife,
            credentials,
            dryRun
        });
    }

    const allWorkspacesInOrg = getWorkspacePackages(allActiveOrgPackages);

    let workspacesAllDirsAndFiles = await decorateWorkSpacesWithAllDirs({
        listOfWorkspaces: allWorkspacesInOrg,
        credentials}
    );

    console.log(`Total number of Workspace files (PRE any deletions): ${getTotalNumAllWsFiles(workspacesAllDirsAndFiles)}`);

    for(let i = 0; i < workspacesAllDirsAndFiles.length; i +=1){
        const ws = workspacesAllDirsAndFiles[i];
        try {
            const allDIRS = ws._ALLDIRS;
            for(let j = 0; j < allDIRS.length; j += 1) {
                const dir = allDIRS[j];
                const files = dir._ALLFILES;

                for(let k = 0; k < files.length; k +=1){
                    const file = files[k];
                    const fileAge = getFileAgeInDays(file);
                    const daysOver = fileAge - MaxWorkspaceFileAge;
                    if(daysOver > 0) {
                        await deleteFileFromDirWs({file, dir, ws, daysOver, MaxWorkspaceFileAge, dryRun, credentials});
                    }
                }
            }
        } catch(e) {
            console.log(`Error listing files for ws "${ws.label}": `, e)
        }
    }

    console.log(`Total number of Workspace files (post any deletions): ${getTotalNumAllWsFiles(workspacesAllDirsAndFiles)}`);

    return workspacesAllDirsAndFiles;
};
