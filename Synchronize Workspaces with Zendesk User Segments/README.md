# Instructions for running Sync Guide to Workspace Script #

This script can be used for customers that would like to use a SendSafely Workspace for authenticated file distribution through Zendesk Guide. Refer to the SendSafely [blog post](https://blog.sendsafely.com/secure-software-distribution-zendesk-guide) and [Help Center article](https://sendsafely.zendesk.com/hc/en-us/articles/360029571932) on this topic for more details on the intended use case for this script.  

In order to run the script, you will need to have Node.js installed. Here are instructions on how to install node and run the script:

**1)** Visit https://nodejs.org/en/ and install the most recent version of Node.js.

**2)** You will need to update a few variables at the top of the script. The following lines will need to be edited:

```var ssHost = "https://yourcompany.sendsafely.com";
var ssApiKey = "abcdef12345";
var ssApiSecret = "vwxyz67890";

var zdHost = "https://yourcompany.zendesk.com";
var zdAuthToken = "support@yourcompany.com/token:abc123efg456";

var packageToTag = {
    "AAAA-1111": "product-1-tag",
    "BBBB-2222": "product-2-tag",
    "CCCC-3333": "product-3-tag"
};
```
You will need either the `packageID` or the `packageCode` of each Workspace, which you want to associate with a given Zendesk product tag. 

These values (`packageID` or `packageCode`) will be set as the keys of the `packageToTag` object, and they both can be found in the Workspace root:
- The `packageID` is found in the Workspace URL, where it has a format of eight alpha-numeric characters separated by a hyphen (“-”).
- The `packageCode` is found in the Workspace link (at bottom of the screen). Copy all the characters from the “=” after `packageCode`, up to (but not including), the “#” before `keycode` in the URL.

**3)** Save the edited script and open a command line window. Navigate to the folder where you downloaded the script and run the following commands to install the required node modules (this command must be run from the same folder where the script is stored):

`npm install`

**4)** Next, run the script using the following command:

`node SyncGuideToWorkspace.js`

The script will synchronize the list of Workspace collaborators in each of the product Workspaces with the list of segment members. For more detailed information on how to use this script, refer to "Step 5 - Synchronize Workspace Collaborators and Zendesk Segment Members" in our [Help Center article](https://sendsafely.zendesk.com/hc/en-us/articles/360029571932). 
