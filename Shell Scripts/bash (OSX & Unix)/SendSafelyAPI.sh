#!/bin/bash

## Add your API key and secret below ##

key='PUT_YOUR_API_KEY_HERE'
secret='PUT_YOUR_API_SECRET_HERE'

## Do not modify below this line ##

method='GET'

while getopts "u:m:b:vh" opt; do
  case $opt in
    u) url=$OPTARG      ;;
    m) method=$OPTARG   ;;
    b) body=$OPTARG   ;;
    v) verbose='-v'	;;
    h) help=true	;;
    *) echo 'error' >&2
       exit 1
  esac
done

printf '\nSendSafely API Bash Script\n\n'

if [ ! -n "$url" ] || [ ! -z "$help" ]; then
    printf 'Usage Examples:\n\n'
    echo ' ' $0 '-u https://www.sendsafely.com/api/v2.0/user'
    echo ' ' $0 '-m PUT -u https://www.sendsafely.com/api/v2.0/package/ -b '\''{"vdr":"false"}'\'
    echo ' '
    exit 1
fi

if [[ "$key" == "PUT_YOUR_API_KEY_HERE" ]]; then
    printf 'Error: You must update your API key and secret within the script.\n\n'
    exit 1
fi

host="$(echo $url | cut -d/ -f1,2,3)"
path="/$(echo $url | cut -d/ -f4-)"
echo 'Issuing Request:' 
echo ' API Key ID:' $key
echo ' Host:' $host
echo ' Path:' $path
echo ' Method:' $method
printf '\nResponse:\n'

timestamp() {
 date -u +"%Y-%m-%dT%H:%M:%S+0000"
}

signature() {
 echo -n $data | openssl dgst -binary -sha256 -hmac ${secret} | xxd -p -c 256
}

timestamp=$(timestamp)

if [ ! -n "$body" ]; then
 data=$key$path$timestamp
 signature=$(signature)
 curl=$(curl $verbose -s -X "${method}" -H "ss-api-key: ${key}" -H "ss-request-timestamp: ${timestamp}" -H "ss-request-signature: ${signature}" -H "Content-Type: application/json" ${url})
 echo ${curl}
else
 data=$key$path$timestamp$body
 signature=$(signature)
 curl=$(curl $verbose -s -X "${method}" -d "${body}" -H "ss-api-key: ${key}" -H "ss-request-timestamp: ${timestamp}" -H "ss-request-signature: ${signature}" -H "Content-Type: application/json" ${url})
 echo ${curl}
fi
