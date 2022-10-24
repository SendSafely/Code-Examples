
const AWS = require('aws-sdk');
const region = process.env.AWS_REGION;
const secretName = process.env.SECRET_NAME;

const secretsManager = new AWS.SecretsManager({
    region: region
});

const getSecretsAsync = async ()  => {
    try {
        const secrets = await secretsManager.getSecretValue({
            SecretId: secretName
        }).promise();

        return JSON.parse(secrets.SecretString);

    } catch(e) {
        console.log('error getting secrets: ', e);
    }
};

exports.getSecretsAsync = getSecretsAsync;