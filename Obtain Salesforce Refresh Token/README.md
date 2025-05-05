# Instructions for running the Salesforce Refresh Token script

## Requirements

**The script requires the following:**

- Node.js to be installed on the system that will be used to run the script

- The script will require you to enter the following values obtained during the Salesforce Connected App setup:

  - Salesforce Consumer Key
  - Salesforce Consumer Secret


## Setup and Run

Below are instructions on how to install Node.js and run the script.

**1)** Visit https://nodejs.org/en/ and install the most recent LTS version of Node.js

**2)** Open a command line prompt using CMD on Windows or the Terminal program on MacOSX, and run the following command to install script dependencies:

```shell
npm install
```

**3)** Run the script using the syntax shown below. The script will prompt you to enter the Consumer Key and Consumer Secret.


```shell
node getRefreshToken.js
```

**4)** Once the above inputs are provided, the script will produce a URL that you must copy/paste into your browser while authenticated to Salesforce. This URL will prompt you for permission to authorize the app to run. Once authorized, you will be redirected to a screen that says "Remote Access Application Authorization". In the URL you will see a value that says code=XXXX where XXXX is the Authorization Code. Please copy that value (excluding the code= portion of the value) and provide it to the script when prompted. 


**5)** Once the script verifies the Authorization Code, it will print the Refresh Token to the screen. The Refresh Token is a credential for Salesforce. Make sure you do not store it unprotected or disclose it to anyone. 
