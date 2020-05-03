# Instructions for running Get Files from Dropzone Console App #

In order to run this app, you will need to have a valid SendSafely account with a Dropzone enabled. The SLN file can be opened and compiled using Visual Studio.

You can run the app from the command line using the following syntax:
`SendSafelyConsoleApplication.exe SendSafelyHost UserApiKey UserApiSecret COMMAND`

The app requires the following command line parameters: 

- SendSafelyHost: The SendSafely hostname to connect to.  Enterprise users should connect to their designated hostname (ie company-name.sendsafely.com)

- UserApiKey: The API key for the user you want to connect to.  API Keys can be obtained from the Edit Profile screen when logged in to SendSafely

- UserApiSecret: The API Secret associated with the API Key used above.  The API Secret is provided to you when you generate a new API Key.  

- COMMAND: The command to perform, must be either CREATE-KEY, LIST-PACKAGES or GET-FILES

  - CREATE-KEY: Generates a trusted device key that can be used to decrypt incoming files. This command produces a private key file named key_id.key, where key_id is the unique key id associated with the private key.
 
  - LIST-PACKAGES: Lists all active packages that are available for download and includes the package ID for each. 

  - GET-FILES: Downloads the files for a package. This command requires the following additional parameters:

    - KeyFile: The file containing your endSafely Private Key. The private key can be generated using CREATE-KEY 

    - KeyId: The unique KeyId associated with your SendSafely Private Key. A Private Key can be generated using CREATE-KEY 

    - PackageId: The Package Id to download files from. All files will be stored in a directory named with the PackageId.

 
Instructions for Use:

NOTE: You must run the sample app using an API Key and API Secret that belongs to the Dropzone Owner account. 

1. Use the "Generate Key" option to generate a private PGP key. This key will be required to decrypt incoming files. By default the key will be saved to a file in the folder where you run the app (key_id.key).  

2. Pull up your Dropzone in a browser and submit a test file. 

3. Run the app to get a list of available packages. The "List Packages" option will show you a list of all inbound package ids for your account. You should see the package from Step 2 listed as the most recent package (note the Package Id value). 

4. Run the app with the "Get Files" option using the Package Id obtained from Step 3 along with your private key and key id. The app will download and decrypt the files and save them to a folder (the folder name will be the package id).

