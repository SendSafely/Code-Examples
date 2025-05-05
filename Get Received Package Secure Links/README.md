# Instructions for running SendSafely Get Received Package Secure Links Script #
The script connects to the SendSafely API and prints the secure link for every package received in the specified time frame. 

This script requires use of a Trusted Browser Key. If you create a new key in order to run this script, please note that the new key won't be able to access any existing received items unless you log into the portal and "sync" the key using another existing trusted browser. If you don't sync the key, then you'll only be able to access new form submissions going forward (not existing old items).

### Steps to Get Started

In order to run the script, you will need to have Node.js installed. Here are instructions on how to install node and run the script:

**1)** Visit https://nodejs.org/en/ and install the most recent version of Node.js.

**2)** You will need to update the following variables at the top of the script:

- BASE_URL: The URL that you use to access the SendSafely Portal 
- API_KEY: API Key belonging to the user whose received packages you want to retrieve the secure links for 
- API_SECRET: API Secret for the API Key above 
- PUBLIC_KEY_ID: The public key id for the user's Trusted Browser Key
- PRIVATE_KEY: The full text of the private key portion of the user's Trusted Browser Key  
- START_TIME: The start time
- END_TIME: The end time
- RECIPIENT: The email address of the Dropzone owner

**3)** Get Received Package Secure Links

`node GetReceivedPackageSecureLinks.js`

When you run this command, the script will loop through every item in the specified timeframe and print its secure link.
