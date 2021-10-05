# Instructions for running Dropzone Upload CLI

## Requirements

**The Dropzone Upload CLI requires the following:**

- Node.js to be installed on the system that will be used to run the script

- The SendSafely hostname, Dropzone ID and relative or absolute path of the file(s) to upload

## Setup and Run

Below are instructions on how to install Node.js and run the script.

**1)** Visit https://nodejs.org/en/ and install the most recent LTS version of Node.js

**2)** Open a command line prompt using CMD on Windows or the Terminal program on MacOSX, and run the following command to install the CLI globally:

```shell
npm install -g @sendsafely/sendsafely
```

**3)** Run the script with your host, Dropzone ID, email and file paths substituted for the placeholder
values shown in the example below (command is available globally).

```shell
sendsafely-dropzone-upload --host="https://www.sendsafely.com" --dropzoneId="AABBCCZZYYZZ" --email="example@example.com" --label="your_package_label" --files "myFile1" "myFile2" "/path/to/my/file/file3"
```

**4)** For the full list of flags and parameters, use ``--help``, like so:
```shell
sendsafely-dropzone-upload --help
```
