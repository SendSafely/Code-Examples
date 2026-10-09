# Instructions for running Enterprise Contact Group Sync to Okta Script #

This script will synchronize a list of Enterprise Contact Group members in SendSafely with members of a Group in Okta. This is useful for cases where you want to use an Okta Group as the basis for who should be able to access files via an Enterprise Contact Group.

In order to run the script, you will need to have Node.js installed. Here are instructions on how to install node and run the script:

**1)** Visit https://nodejs.org/en/ and install the most recent version of Node.js.

**2)** You will need to update the following variables at the top of the script:

- **ssHost**: The URL that you use to access the SendSafely Portal
- **oktaHost**: The URL you use to access your Okta Portal
- **ssApiKey**: API Key belonging to an admin user for the SendSafely instance (which contains the Enterprise Contact Group you want to sync)
- **ssApiSecret**: API Secret for the API Key included above
- **ssContactGroupId**: Unique Group ID for SendSafely Enterprise Group (only available from API query)
- **oktaApiToken**: Okta API Token for API Access (https://developer.okta.com/docs/guides/create-an-api-token/overview/)
- **oktaGroupId**: Okta group id for the group you want to sync. This is a unique alphanumeric value visible in the Okta Admin portal URL when viewing the group (ie. /admin/group/{group id})

**3)** Save the edited script and open a command line window. Navigate to the folder where you downloaded the script and run the following commands to install the required node modules (this command must be run from the same folder where the script is stored):

`npm install`


**4)** Next, run the script using the following command:

`node ContactGroupOktaSync.js`

The script will analyze the list of group members from Okta and will:
- Add users to the Enterprise Contact Group that are not already on the Enterprise Contact Group
- Remove users from the Enterprise Contact Group if they are not in the Okta group

The script does NOT add or remove anyone from the list of group members in Okta. 
