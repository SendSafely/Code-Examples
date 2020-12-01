# Instructions for running Organization Activity Export Scripts #

The Organization Activity Export scripts require Node.js installed to run them. 

- **GetOrganizationActivity.js** - exports all sent and received activity within your SendSafely portal within the specified timeframe
- **GetOrganizationDownloads.js** - exports all of the confirmed download activity for sent and received items within your SendSafely portal within the specified timeframe

Here are instructions on how to install node and run the scripts:

**1)** Visit https://nodejs.org/en/ and install the most recent LTS version of Node.js.

**2)** Download the latest [Export Organization Activity Logs.zip](https://github.com/SendSafely/Code-Examples/raw/master/Export%20Organization%20Activity%20Logs/dist/Export%20Organization%20Activity%20Logs.zip) file to your file system and extract to a folder. Alternatively, you can clone the entire [Code-Examples GitHub repository](https://github.com/SendSafely/Code-Examples.git) to your file system.
 
**3)** Update the user defined parameters at the top of the GetOrganizationActivity.js and GetOrganizationDownloads.js scripts in the "Export Organization Activity Logs" folder. The scripts require use of a SendSafely Enterprise Administrator API key and secret which can be obtained from the API Keys section of your Profile page when logged into SendSafely. Specifically, the following constants will need to be updated in each script:

```
/* START USER DEFINED PARAMETERS */

const ssHost = "https://yourcompany.sendsafely.com";
const ssApiKey = "PUT_YOUR_API_KEY_HERE";
const ssApiSecret = "PUT_YOUR_API_SECRET_HERE";

const fromDate = '3/1/2020';
const toDate = '10/10/2020';

/* END USER DEFINED PARAMETERS */
```

**4)** Save the edited scripts and open a command line window. Navigate to the folder containing the scripts and run the following command to install required node modules (this command must be run from the same folder where the scripts are stored):

`npm install`

**5)** Next, the scripts can be run using the following commands:

`npm run activity`

`npm run downloads`

The scripts will print CSV output to the screen which may imported into Excel or another program for further analysis. 
