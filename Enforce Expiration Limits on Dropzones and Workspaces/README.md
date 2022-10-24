# Instructions for running this script

## Requirements

This script can be run from AWS Lambda (using NodeJS) or from the command line of any system with NodeJS installed.

## Setup and run

### Command Line
Instructions to install NodeJS and run the script from the command line:
1. Visit https://nodejs.org/en/ and install the most recent LTS version of Node.js

2. Open a command line prompt using CMD on Windows or the Terminal program on MacOSX, and install the scripts dependencies: <br/>`npm install`

3. Run the script with your SendSafely host, API key and API secret substituted for the placeholder values shown below.<br/> `node app.js  ssHost=XXXXXXX ssApiKey=XXXXXXX ssApiSecret=XXXXXXX`

4. Pass in integer values (days) for `MaxDropzonePackageLife` or `MaxWorkspaceFileAge`, to override default of `90` days.

### AWS Lambda
1. From the command line of a machine with NodeJS installed, install the scripts dependencies: `npm install`<br>The dependencies will be downloaded into the node_modules folder.

2. Create ZIP file from following files/directories and upload via AWS console to create the Lambda function:
    - node_modules/
    - utils/
    - index.js
    - app.js

You can invoke the Lambda function as follows, using AWS console:
```
aws lambda invoke --function-name <Lambda Function ARN> <File-to-record-response>.json
```