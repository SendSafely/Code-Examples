# Instructions for running Sync Dropzone to Zendesk Java App #

This java code will synchronize a list of Dropzone recipients in SendSafely with your list of agents in Zendesk. This is useful for cases where you want to make sure that all of your Zendesk agents have access to files that are uploaded through a Dropzone and have access revoked when they are removed from Zendesk.  

Refer to our [Help Center article](https://sendsafely.zendesk.com/hc/en-us/articles/360016093811) for a complete walk through of the intended use case for this code. 

**Steps to run this example:**

1. Update ZendeskSyncDropzone.java with credentials for the Zendesk and SendSafely Users

2. Recompile the code
javac -d bin -cp lib/SendSafely.jar:lib/bcpg-jdk15on-151.jar:lib/bcprov-jdk15on-151.jar:lib/gson-2.3.jar:lib/zendesk-client.jar:lib/async-http-client-1.9.15.jar:lib/handy-uri-templates-1.1.7.jar:lib/jackson-annotations-2.1.4.jar:lib/jackson-core-2.1.4.jar:lib/jackson-databind-2.1.4.jar:lib/slf4j-api-1.7.2.jar:lib/slf4j-simple-1.7.2.jar src/ZendeskSyncDropzone.java

3. Run the app 
java -cp lib/*:bin/ ZendeskSyncDropzone
 
*NOTE: There is also a "previewOnly" flag that is set to "true" by default, meaning that the program will print what it would normally do without actually making the updates. You can use this to prevent any updates from occurring until you are comfortable that the program is working correctly.*
