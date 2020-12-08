# Instructions for running Workspace Export Script

## Requirements
The Workspace Export script requires the following:

* Node.js installed on the system that will be used to run the script
* The shareable link for the Workspace that you are planning to export. It should look like the following:

   `https://demo.sendsafely.com/receive/?packageCode=xxx#keycode=xxx`

  The shareable link can be obtained underneath *"Collaborators can use the following link to access this Workspace:"* when logged into the workspace.
  
* SendSafely API key and secret of a registered SendSafely account that is a collaborator on the target Workspace. You can obtain the API key pair from the API Keys section of your Profile page when logged into SendSafely.

## Setup and Run
Below are instructions on how to install Node.js and run the script. For more detailed instructions, please refer to our [Workspace Export Script](https://sendsafely.zendesk.com/hc/en-us/articles/360053313191) Help Center article:

**1)** Visit https://nodejs.org/en/ and install the most recent LTS version of Node.js

**2)** Download the latest [Workspace Export.zip file from the "dist"](https://github.com/SendSafely/Code-Examples/tree/master/Workspace%20Export/dist) folder and extract to a folder on your file system. Alternatively, you can clone the entire [Code-Examples GitHub repository](https://github.com/SendSafely/Code-Examples.git) to your file system.

**3)** Open a command line prompt using CMD on Windows or the Terminal program on MacOSX, change into the folder containing the script, and run the following command to install required Node modules: 

`cd "Workspace Export"`
                                                                                          
`npm install`

**4)** Run the script with your secure link and SendSafely API key and secret values substituted for the placeholder values shown in the example below.
 
`
node ./WorkspaceExport.js --secureLink="YOUR SECURE LINK" --apiKey="YOUR API KEY" --apiSecret="YOUR API SECRET" 
`
### Command-Line Options:
 
 - **`--secureLink`** The shareable link for the Workspace that you are planning to export
 - **`--apiKey`** Your SendSafely API key obtained the API Keys section of your Profile page when logged into SendSafely
 - **`--apiSecret`** Your SendSafely API secret obtained the API Keys section of your Profile page when logged into SendSafely
 - **`--out`** Optional parameter the specifies the location of the folder to export the files to on your system. The script will automatically create the folder if it does not exist. Otherwise the script defaults to the following:
 
   `{workspace label}/{timestamp}`
    
    

 

