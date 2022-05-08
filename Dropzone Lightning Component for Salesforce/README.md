# Installing the SendSafely Dropzone Widget for Salesforce Community Sites

This README describes the steps for installing and configuring our native JavaScript SendSafely Dropzone widget into a Salesforce Community site. The steps assume use of the provided sample Lightning Component web form, however the widget can be easily integrated with any custom Lightning Component.

## Static Resources Setup
You will need to setup the following Static Resources:

- **SendSafelyDropzone.native.js** - this is the required native JavaScript SendSafely Dropzone widget code
- **bootstrap.min.css** - this is used by the sample SendSafelyDropzoneNative Lightning Component web form

You can create Static Resources logged into your Salesforce organization using the following menu path:
 
 *Setup -> Custom Code -> Static Resources -> click New*

Create two new Static Resources, one for SendSafelyDropzone.native.js named `sendsafely` and the other bootstrap.min.css named `bootstrap`. It's important to use these specific names since this is how they are referenced from the provided `SendSafelyDropzoneNative.cmp` Lightning Component.

## SendSafelyDropzoneNative Lightning Component
Included are the `SendSafelyDropzoneNative.cmp` and `SendSafelyDropzoneNativeController.js` Lightning Component files that already have the SendSafely Dropzone widget integrated into a basic web form. The setup assumes use of the built-in Salesforce Developer Console (*however an IDE such as Visual Studio Code with Salesforce Extensions installed could also be used*). 

*Setup -> Developer Console -> click File ->  New -> Lightning Component*

1) Type `SendSafelyDropzoneNative` for name and check Lightning Communities Page checkbox -> click Submit 
2) Copy code from `SendSafelyDropzoneNative.cmp` and `SendSafelyDropzoneNativeController.js` to the appropriate locations in the Developer Console. 
3) In `SendSafelyDropzoneNativeController.js` update `apiKey`, `organizationId`, and `widget.url` to appropriate values.
   - `dropzoneId` = SendSafely Dropzone ID obtained from user's Edit Profile page. Follow the instructions outlined [here](https://sendsafely.zendesk.com/hc/en-us/articles/360004713432-Hosted-Dropzone-Set-Up%C2%A0) to turn on your SendSafely Dropzone and obtain your Dropzone ID.
   - `organizationId` = Salesforce Organization Id (Setup -> Company Setup -> Company Information -> Organization Detail screen -> Salesforce.com Organization ID)
   - `widget.url` = Your SendSafely organization hostname (i.e. https://exampleabc.sendsafely.com)

## Configure SendSafely in Salesforce Community Site Builder
Next we will add the example `SendSafelyDropzoneNative` Lightning Component to a Salesforce Community Site. Logged into your Salesforce organization, use the following menu path:

*Setup -> Feature Settings -> Digital Experiences -> All Sites -> click Builder to modify existing Community Site (*or New Community to setup a new site*)*

1) Once in Community Builder, click on the Lightning Component icon and scroll down to Custom Components. 
2) Drag and drop the newly created SendSafelyDropzoneNative Lightning Component to your help center form and click publish. 

*Note: The community site URL can be found from All Sites page*

## Ensure Salesforce Web-to-Case Enabled
The example `SendSafelyDropzoneNative` Lightning Component uses Salesfore Web-to-Case functionality, so you'll need to make sure that is enabled.

*Setup -> Feature Settings -> Service -> Web-to-Case -> ensure Enable Web-to-Case checked under Basic Settings*

## Salesforce Content Security Policy Updates
Due to Salesforce [default Strict CSP policy](https://help.salesforce.com/articleView?id=sf.networks_security_csp_overview.htm&type=5), you'll need to configure the policy to allow your SendSafely portal and the Web-to-Case URL, used by the example `SendSafelyDropzoneNative` Lightning Component.

*Setup -> Security -> CSP Trusted Sites*

Add Trusted Sites for the following: 

- https://webto.salesforce.com
- https://exampleabc.sendsafely.com
- https://static-exampleabc.sendsafely.com
- https://app-static.sendsafely.com (for logo)

*Note: exampleabc.sendsafely.com should be replaced with your SendSafely portal's organization hostname*