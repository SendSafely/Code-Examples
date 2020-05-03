# Instructions for running Organization Activity Export Scripts #

In order to run the script, you will need to have Node.js installed. Here are instructions on how to install node and run the script:

**1)** Visit https://nodejs.org/en/ and install the most recent version of Node.js.

**2)** You will need to update a few variables at the top of the script so that it can authenticate using a SendSafely admin account. The following lines will need to be edited:

```var ssHost = "https://yourcompany.sendsafely.com";
var ssApiKey = "PUT_YOUR_API_KEY_HERE";
var ssApiSecret = "PUT_YOUR_API_SECRET_HERE";
var fromDate = '3/1/2020';
var toDate = '4/1/2020';
```

**3)** Save the edited script and open a command line window. Navigate to the folder where you downloaded the script and run the following commands to install three required node modules (this command must be run from the same folder where the script is stored):

`npm install sync-request`

`npm install moment`

`npm install sjcl`

**4)** Next, run the script using the following command:

`node GetOrganizationActivity.js`

`node GetOrganizationDownloads.js`

The script will print CSV output to the screen which can then be imported into excel or another program for further analysis. 