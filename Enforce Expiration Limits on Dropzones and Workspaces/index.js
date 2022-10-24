const {app} = require('./app');
const {getSecretsAsync} = require("./utils/secretsManager");


exports.handler = async (event, context, callback) => {
    let {MaxDropzonePackageLife = 90, MaxWorkspaceFileAge = 90, dryRun = true, packageStatus = "ALL" } = event;
    const {ssHost, ssApiKey, ssApiSecret} = await getSecretsAsync();
    const credentials = {ssHost, ssApiKey, ssApiSecret};

    let scriptReturn;
    let statusCode;

    packageStatus = packageStatus.toUpperCase();
    if(packageStatus !== "ACTIVE" && packageStatus !== "ALL") {
        packageStatus = "ALL";
    }

    if(!!process.env.DRY_RUN && process.env.DRY_RUN.toLowerCase() === 'false') {
        dryRun = false;
    }

    if(!!process.env.MAX_PACKAGE_LIFE) {
        MaxDropzonePackageLife = process.env.MAX_PACKAGE_LIFE;
    }

    if(!! process.env.MAX_FILE_AGE) {
        MaxWorkspaceFileAge = process.env.MAX_FILE_AGE;
    }

    try {
        let activePackageResponse = [];
        let expiredPackageResponse = [];
        if(packageStatus === "ALL") {
            console.log('Checking ALL packages in organization (ACTIVE and EXPIRED)...');
            activePackageResponse = await app({
                MaxDropzonePackageLife,
                MaxWorkspaceFileAge,
                packageStatus: "ACTIVE",
                dryRun,
                credentials
            });
            // Packages in archived workspaces are in "expired" state
            expiredPackageResponse = await app({
                MaxDropzonePackageLife,
                MaxWorkspaceFileAge,
                packageStatus: "EXPIRED",
                dryRun,
                credentials
            });
            scriptReturn = activePackageResponse.concat(expiredPackageResponse);
        } else {
            console.log('Checking ACTIVE packages in organization only...');
            scriptReturn = await app({
                MaxDropzonePackageLife,
                MaxWorkspaceFileAge,
                packageStatus: "ACTIVE",
                dryRun,
                credentials
            });
        }
        statusCode = 200;
    } catch (e) {
        console.log(`Error encountered during script execution: `, e);
        scriptReturn = e;
        statusCode = 500;
    }

    const response = {
        statusCode,
        body: scriptReturn
    };

    if(response.statusCode !== 200) {
        console.log(`Failure encountered during script execution: `, response.body);
        throw new Error('Failure encountered during script execution');
    }
    callback(null, response);
};


(async function commandLineInvocation () {
    const getArgs = function(){
        const args = process.argv.slice(2);
        let params = {};

        args.forEach(a => {
            const nameValue = a.split("=");
            params[nameValue[0]] = nameValue[1];
        });

        return params;
    };

    const cliArgs = getArgs();

    if(cliArgs && cliArgs.ssHost && cliArgs.ssApiKey && cliArgs.ssApiSecret) {
        const {ssHost, ssApiKey, ssApiSecret,
            MaxDropzonePackageLife = 90,
            MaxWorkspaceFileAge = 90,
            dryRun = true
        } = cliArgs;
        const cliCredentials = {ssHost, ssApiKey, ssApiSecret};

        let {packageStatus = "ALL"} = cliArgs;
        let scriptReturn;

        packageStatus = packageStatus.toUpperCase();
        if(packageStatus !== "ACTIVE" && packageStatus !== "ALL") {
            packageStatus = "ALL";
        }

        try {
            let activePackageResponse = [];
            let expiredPackageResponse = [];
            if(packageStatus === "ALL") {
                console.log('Checking ALL packages in organization (ACTIVE and EXPIRED)...');
                activePackageResponse = await app({
                    MaxDropzonePackageLife,
                    MaxWorkspaceFileAge,
                    packageStatus: "ACTIVE",
                    dryRun,
                    credentials: cliCredentials
                });
                // Packages in archived workspaces are in "expired" state
                expiredPackageResponse = await app({
                    MaxDropzonePackageLife,
                    MaxWorkspaceFileAge,
                    packageStatus: "EXPIRED",
                    dryRun,
                    credentials: cliCredentials
                });
                scriptReturn = activePackageResponse.concat(expiredPackageResponse);
            } else {
                console.log('Checking ACTIVE packages in organization only...');
                scriptReturn = await app({
                    MaxDropzonePackageLife,
                    MaxWorkspaceFileAge,
                    packageStatus: "ACTIVE",
                    dryRun,
                    credentials: cliCredentials
                });
            }

            console.log(`##### END #####`);
            console.log(scriptReturn);

        } catch(e) {
            console.log(`Error encountered during script execution: `, e);
        }
    }
})();

