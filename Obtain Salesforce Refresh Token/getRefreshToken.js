const oauth2 = require('salesforce-oauth2');
const inquirer = require('inquirer')

var salesforce_base_url = 'https://login.salesforce.com';

var questions1 = [{
  type: 'input',
  name: 'consumer_key',
  message: "Please provide your Salesforce Consumer Key:",
  validate: validateRequired
},
{
  type: 'input',
  name: 'consumer_secret',
  message: "Please provide your Salesforce Consumer Secret:",
  validate: validateRequired,
},
{
  type: 'input',
  name: 'is_sandbox',
  message: "Is this a sandbox environment?",
  default: false,
  validate: validateBoolean,
}
]

var questions2 = [{
  type: 'input',
  name: 'authorization_code',
  message: "Please provide the Salesforce Authorization Code:",
}
]


console.log("\n\n** Welcome to the Salesforce Refresh Token Generator (v1.1) **\n");
inquirer.prompt(questions1).then(answers => {

  if (answers['is_sandbox'].toString().toLowerCase() == 'true')
  {
	salesforce_base_url = 'https://test.salesforce.com';
  }

  var consumerKey = answers['consumer_key'];
  var consumerSecret = answers['consumer_secret'];
   console.log("\n\nAuthorization URL:\n");
   initOauth(consumerKey);
   console.log("\n\nPlease copy the URL shown above into a browser window where you are logged into Salesforce. When promoted, authorize the app to run. Once authorized, you will be redirected to a screen that says \"Remote Access Application Authorization\". In the URL you will see a value that says code=XXXX where XXXX is the Authorization Code. Please copy that value (excluding the code= portion of the value) and paste it below to obtain the Refresh Token \n\n");
    inquirer.prompt(questions2).then(answers => { 
	 var authorizationCode = decodeURIComponent(answers['authorization_code']);
	 getRefreshToken(consumerKey, consumerSecret, authorizationCode);
    });
 
});

    function initOauth(consumerKey) {
        var uri = oauth2.getAuthorizationUrl({
            redirect_uri: salesforce_base_url + '/services/oauth2/success',
            client_id: consumerKey,
            scope: 'offline_access refresh_token api', // 'id api web refresh_token'
            // You can change loginUrl to connect to sandbox or prerelease env.
            base_url: salesforce_base_url
        });
        console.log(uri);
    }

    function getRefreshToken(consumerKey, consumerSecret, authorizationCode) {
        oauth2.authenticate({
            redirect_uri: salesforce_base_url + '/services/oauth2/success',
            client_id: consumerKey,
            client_secret: consumerSecret,
            code: authorizationCode,
            // You can change loginUrl to connect to sandbox or prerelease env.
            base_url: salesforce_base_url
        }, function(error, payload) {
            if (error) 
            {	
		console.log("ERROR:\n");
		console.log(JSON.stringify(error));
		
	    } else {
 		console.log("Success. Your refresh token is shown below:\n");
		console.log(payload.refresh_token + "\n\n");
            }
           

        });
     }
function validateRequired(val){
        return val !== '' && val.trim() !== '';
    }

function validateBoolean(val){
        return val === true || val === false || val.toLowerCase() == "true" || val.toLowerCase() == "false";
    }


