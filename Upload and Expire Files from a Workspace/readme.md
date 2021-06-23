# Instructions for running Upload and Expire Files from a Workspace Script #

The script will check any existing files in the Workspace (root directory only) to see if any are older than the "expirationMinutes" value specified in the script. If so, it will delete the file. After the files have been checked, it will upload the filename you specify on the command line to the workspace.  

In order to run the script, you will need to have Node.js installed. Here are instructions on how to install node and run the script:

**1)** Visit https://nodejs.org/en/ and install the most recent version of Node.js.

**2)** You will need to update the following variables at the top of the script:
- ssHost: The URL that you use to access the SendSafely Portal 
- ssApiKey: API Key belonging to the Dropzone Owner for the Dropzone you want to sync 
- ssApiSecret: API Secret for the API Key included above 
- workspaceLink: The full link to the workspace you want to use (the link must include a keycode value)
- expirationMinutes: The number of minutes after which files should be considered expired. For example, two days would be 2880 (60 minutes * 24 hours * 2 days)

**3)** Save the edited script and open a command line window. Navigate to the folder where you downloaded the script and run the following commands to install three required node modules (this command must be run from the same folder where the script is stored):

`npm install @sendsafely/sendsafely`

`npm install moment`

`npm install sjcl`

**4)** Next, run the script using the following command. A filename must be passed after the script name (this is the file that will be uploaded). 

`node dailyUpload.js myfile.txt`


