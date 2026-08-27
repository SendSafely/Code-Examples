const https = require('https');
const crypto = require('crypto');
const inquirer = require('inquirer')

var salesforce_base_url = 'https://login.salesforce.com';

var questions1 = [{
  type: 'input',
  name: 'consumer_key',
  message: "Please provide your Salesforce Consumer Key:",
  validate: validateRequired,
  filter: function(val) { return val.trim(); },
},
{
  type: 'input',
  name: 'consumer_secret',
  message: "Please provide your Salesforce Consumer Secret:",
  validate: validateRequired,
  filter: function(val) { return val.trim(); },
},
{
  type: 'input',
  name: 'my_domain_url',
  message: "Please provide your Salesforce My Domain URL (recommended; press Enter to use login.salesforce.com):",
  default: '',
  validate: validateMyDomain,
},
{
  type: 'input',
  name: 'is_sandbox',
  message: "Is this a sandbox environment?",
  default: false,
  validate: validateBoolean,
  when: answers => !answers.my_domain_url.trim(),
}
]

var questions2 = [{
  type: 'input',
  name: 'authorization_code',
  message: "Please provide the Salesforce Authorization Code:",
  filter: function(val) { return val.trim(); },
}
]


console.log("\n\n** Welcome to the Salesforce Refresh Token Generator (v3.0) **\n");
inquirer.prompt(questions1).then(answers => {

  var isSandbox = false;
  if (answers['my_domain_url'] && answers['my_domain_url'].trim())
  {
    var host = answers['my_domain_url'].trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    salesforce_base_url = 'https://' + host;
    isSandbox = host.indexOf('.sandbox.') !== -1;
  }
  else if (answers['is_sandbox'].toString().toLowerCase() == 'true')
  {
    salesforce_base_url = 'https://test.salesforce.com';
    isSandbox = true;
  }

  // The redirect_uri must exactly match the Callback URL configured on the app,
  // regardless of which host the authorize/token endpoints use.
  var redirect_uri = (isSandbox ? 'https://test.salesforce.com' : 'https://login.salesforce.com') + '/services/oauth2/success';

  // PKCE: random verifier, S256 challenge
  var code_verifier = base64UrlEncode(crypto.randomBytes(32));
  var code_challenge = base64UrlEncode(crypto.createHash('sha256').update(code_verifier).digest());

  var consumerKey = answers['consumer_key'];
  var consumerSecret = answers['consumer_secret'];
  console.log("\n\nAuthorization URL:\n");
  initOauth(consumerKey, redirect_uri, code_challenge);
  console.log("\n\nPlease copy the URL shown above into a browser window where you are logged into Salesforce. When prompted, authorize the app to run. Once authorized, you will be redirected to a screen that says \"Remote Access Application Authorization\". In the URL you will see a value that says code=XXXX where XXXX is the Authorization Code. Please copy that value (excluding the code= portion of the value) and paste it below to obtain the Refresh Token \n\n");
  inquirer.prompt(questions2).then(answers => {
    var authorizationCode = decodeURIComponent(answers['authorization_code']);
    getRefreshToken(consumerKey, consumerSecret, authorizationCode, redirect_uri, code_verifier);
  });

});

    function initOauth(consumerKey, redirect_uri, code_challenge) {
        var params = new URLSearchParams({
            response_type: 'code',
            client_id: consumerKey,
            redirect_uri: redirect_uri,
            scope: 'offline_access refresh_token api', // 'id api web refresh_token'
            code_challenge_method: 'S256',
            code_challenge: code_challenge,
        });
        console.log(salesforce_base_url + '/services/oauth2/authorize?' + params.toString());
    }

    function getRefreshToken(consumerKey, consumerSecret, authorizationCode, redirect_uri, code_verifier) {
        postToTokenEndpoint({
            grant_type: 'authorization_code',
            client_id: consumerKey,
            client_secret: consumerSecret,
            redirect_uri: redirect_uri,
            code: authorizationCode,
            code_verifier: code_verifier,
        }, function(error, payload) {
            if (error)
            {
        console.log("ERROR:\n");
        console.log(JSON.stringify(error));
        printMyDomainHint();

        } else {
        console.log("Success. Your refresh token is shown below:\n");
        console.log(payload.refresh_token + "\n\n");
            }
        });
    }

    function printMyDomainHint() {
        if (salesforce_base_url === 'https://login.salesforce.com') {
            console.log("\nHINT: If authorization failed in the browser, your org may restrict logins on login.salesforce.com. Re-run this script and provide your My Domain URL (the domain shown in your browser's address bar when logged into Salesforce, e.g. yourcompany.my.salesforce.com).\n");
        }
    }

    function postToTokenEndpoint(params, callback) {
        var body = new URLSearchParams(params).toString();
        var req = https.request(salesforce_base_url + '/services/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
        }, function(res) {
            var data = '';
            res.on('data', function(d) { data += d; });
            res.on('end', function() {
                var payload = JSON.parse(data);
                if (res.statusCode == 200) { callback(null, payload); } else { callback(payload, null); }
            });
        });
        req.on('error', function(e) { callback({ error: 'request_error', error_description: e.message }, null); });
        req.end(body);
    }

    function base64UrlEncode(buffer) {
        return buffer.toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

function validateRequired(val){
        return val !== '' && val.trim() !== '';
    }

function validateBoolean(val){
        return val === true || val === false || val.toLowerCase() == "true" || val.toLowerCase() == "false";
    }

function validateMyDomain(val){
        if (val === '' || val.trim() === '') return true;
        var host = val.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        return host.endsWith('.salesforce.com') || 'Must be a *.salesforce.com domain, e.g. yourcompany.my.salesforce.com';
    }
