# Instructions for running Workspace Editor Script #

Usage syntax:

	Create a new workspace:
	node workspaceEditor.js --create --name="workspace_name"
	
	Add collaborators to a workspace:
  	node workspaceEditor.js --collaborators="list_of_email_addresses" --secureLink="workspace_link"
	
	Upload local file/folders to a workspace:
	node workspaceEditor.js --upload="path_to_files" --secureLink="workspace_link"
	
	Do all three operations at once:
	node workspaceEditor.js --create --name="workspace_name" --collaborators="list_of_email_addresses" --upload="path_to_files"

In order to run the script, you will need to have Node.js installed. Here are instructions on how to install node and run the script:

**1)** Visit https://nodejs.org/en/ and install the most recent version of Node.js.

**2)** You will need to update the following variables at the top of the script:
- ssHost: The URL that you use to access the SendSafely Portal 
- ssApiKey: API Key belonging to the Dropzone Owner for the Dropzone you want to sync 
- ssApiSecret: API Secret for the API Key included above 

**3)** Save the edited script and open a command line window. Navigate to the folder where you downloaded the script and run the following command to install the required node modules (this command must be run from the same folder where the script is stored):

`npm install`

**4)** Next, run the script using the following command (the usage syntax will be shown, which you can use to run specific tasks). 

`node workspaceEditor.js`


