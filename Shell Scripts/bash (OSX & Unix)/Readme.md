# Instructions for running SendSafely Bash Script for OSX & Unix #

Before running the script, you will need to update the following variables at the top of the script:

- key: API Key belonging to the Dropzone Owner for the Dropzone you want to sync
- secret: API Secret for the API Key included above

To run the script, you will need to have [curl](https://curl.se/) and [OpenSSL](https://www.openssl.org/) installed on the machine. Both utilities are available natively on most Unix and OSX distributions. Refer to the [SendSafely REST API Documentation](https://go.sendsafely.com/rest-api-docs) for the a list of all supported API endpoints and required HTTP method/parameter combinations. 

**Usage Examples:**

[Get User Information](https://documenter.getpostman.com/view/19611653/2s93K1peyv#b57fc1e1-de4e-448a-9e1f-71b05086a01e)

    ./SendSafelyAPI.sh -u https://www.sendsafely.com/api/v2.0/user
        
[Create Package](https://documenter.getpostman.com/view/19611653/2s93K1peyv#7c29b522-c536-4260-afcb-ed0c4b11a607)

    ./SendSafelyAPI.sh -m PUT -u https://www.sendsafely.com/api/v2.0/package/ -b '{"vdr":"false"}'
 
