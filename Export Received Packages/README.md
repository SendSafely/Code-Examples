# Instructions for running SendSafely Export Received Packages Script #
The script connects to the SendSafely API and downloads a copy of every file and/or message in the received items list. A local "export" folder is used by the script to store all downloaded files, which are organized into subfolders by date and package ID. Once a package is downloaded it won't try to download it again if you re-run the script (as long as the correct folder name is already present). 

Downloading items from your received items using the API requires use of a Trusted Browser Key. The script includes logic to create a new key that you can use, so you'll need to do that first before you run the script. Also note that the new key won't be able to access any existing received items unless you log into the portal and "sync" the key using another existing trusted browser. If you don't sync the key, then you'll only be able to access new form submissions going forward (not existing old items).

### Steps to Get Started

In order to run the script, you will need to have Node.js installed. Here are instructions on how to install node and run the script:

**1)** Visit https://nodejs.org/en/ and install the most recent version of Node.js.

**2)** You will need to update the following variables at the top of the script:

- ssHost: The URL that you use to access the SendSafely Portal 
- ssApiKey: API Key belonging to the Dropzone Owner for the Dropzone you want to sync 
- ssApiSecret: API Secret for the API Key included above 

**3)** Generate a new key for the script to use (first time only)

`node ./ExportReceivedPackages.js generateKey`

After running this command, the script will create a file called XXXX.privatekey.txt where XXXX is the Key Id. You'll need to supply both the key id and the key file when running the script to export submissions. This should be a one-time step that is needed as part of the initial setup process. 

**4)** Export Items

`node ./ExportReceivedPackages.js getFiles ./XXXX.privatekey.txt XXXXX`

XXXX is the Key Id from the previous step. When you run this command, the script will create the "export" folder (if the folder doesn't already exist) and then loop through every item in the received items list and attempt to download them.

### Additional notes

- When the script first attempts to process each upload (referred to as a "package"), it creates a subfolder called "_YYYY-MM-DD_ABCD-1234" where YYY-MM-DD is the date the package was uploaded and ABCD-1234 is the unique package identifier. All files in the package and any secure message (if present) are decrypted and saved to that folder. 

- Once the entire package has been processed successfully, the underscore is removed from the front of the directory name. If an error occurs during processing (for example, if the item can't be decrypted using the supplied private key) then the error details are saved to a file called ERROR.TXT inside of that folder. When that happens, the folder is NOT re-named...so you'll easily tell which items were not successfully downloaded since they will be in a directory that starts with an underscore.  

- Every time the script processes a package, it will looks first to see if there is already a subfolder for that package in the exports folder that does not start with an underscore, indicating that it was previously processed successfully. If it sees that folder, the script will skips that package since the contents are already downloaded successfully. If the folder exists but starts with an underscore exists, the script will try to process the package again since the previous attempt failed. This will allow you to re-run the script over and over again from the same location and it should only attempt to download new items (or items that previously resulted in an error).  
