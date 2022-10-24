# Instructions for running Dropzone Sync to Zendesk Script #

This script will synchronize a list of Dropzone recipients in SendSafely with your list of agents in Zendesk. This is useful for cases where you want to make sure that all of your Zendesk agents have access to files that are uploaded through a Dropzone and have access revoked when they are removed from Zendesk. 

In order to run the script, you will need to have Node.js installed. Here are instructions on how to install node and run the script:

**1)** Visit https://nodejs.org/en/ and install the most recent version of Node.js.

**2)** You will need to update a few variables at the top of the script. The following lines will need to be edited:

```var ssHost = "https://company_name.sendsafely.com";
var zdHost = "https://company_name.zendesk.com";
var ssApiKey = "PUT_YOUR_SENDSAFELY_API_KEY_HERE";
var ssApiSecret = "PUT_YOUR_SENDSAFELY_API_SECRET_HERE";
var zdUsername = "PUT_YOUR_ZENDESK_USERNAME_HERE";
var zdPassword = "PUT_YOUR_ZENDESK_PASSWORD_HERE";
```

**3)** Save the edited script and open a command line window. Navigate to the folder where you downloaded the script and run the following commands to install three required node modules (this command must be run from the same folder where the script is stored):

`npm install @sendsafely/sendsafely`

`npm install sjcl`

`npm install make-fetch-happen`

**4)** Next, run the script using the following command:

`node ZendeskSyncDropzone.js`

The script will analyze the list of agents from Zendesk and will:
- Add users to the Dropzone that are not already on the Dropzone recipients list
- Remove users from the Dropzone list if they are not in the list of active agents

The script does NOT add or remove any agents from Zendesk. 
