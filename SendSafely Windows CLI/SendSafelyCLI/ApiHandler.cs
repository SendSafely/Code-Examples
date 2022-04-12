using System;
using System.Collections;
using System.Text;
using SendSafely;
using SendSafely.Exceptions;
using System.Collections.Generic;

namespace SendSafelyCLI
{
    class ApiHandler
    {
        private ArrayList commands;
        private static ClientAPI api;
        private static Dictionary<String, PackageInformation> packages;
        private static String currentPackageId;

        public ApiHandler()
        {
            commands = new ArrayList();
            commands.Add(new ApiObject("Connect", "Username (or API Key)", new Action<String[]>(ApiHandler.InitialSetup)));
            commands.Add(new ApiObject("Connect", "Host Username (or API Key)", new Action<String[]>(ApiHandler.InitialSetupWithCustomHost)));
            commands.Add(new ApiObject("CreateNewPackage", "", new Action<String[]>(ApiHandler.CreatePackage)));
            commands.Add(new ApiObject("LoadPackage", "PackageId", new Action<String[]>(ApiHandler.GetPackageInfo)));
            commands.Add(new ApiObject("GetPackageInfo","", new Action<String[]>(ApiHandler.GetPackageInfo)));
            commands.Add(new ApiObject("AddFile", "Filename", new Action<String[]>(ApiHandler.EncryptAndUploadFile)));
            commands.Add(new ApiObject("AddRecipient", "Email", new Action<String[]>(ApiHandler.AddRecipient)));
            commands.Add(new ApiObject("GenerateLink", "", new Action<String[]>(ApiHandler.FinalizePackage)));
            commands.Add(new ApiObject("DeletePackage", "", new Action<String[]>(ApiHandler.DeletePackage)));
            commands.Add(new ApiObject("DownloadPackage", "Link SaveToPath", new Action<String[]>(ApiHandler.DownloadPackageFiles)));
            
            api = new ClientAPI();

            packages = new Dictionary<string, PackageInformation>();
        }

        #region Public Commands
        public String getAvailableCommands()
        {
            string desc = "";
            int counter = 0;
            foreach(ApiObject obj in commands)
            {
                desc += "[" + counter++ + "]" + obj.name + " " + obj.description + "\n";
            }
            return desc;
        }

        public void parseCommand(string input)
        {
            // the command will be space separated so split the string
            string[] args = input.Split();
            if (args == null || args.Length == 0)
            {
                return;
            }

            try
            {
                int index = Convert.ToInt32(args[0]);
                if(index < commands.Count)
                {
                    ApiObject obj = (ApiObject)commands[index];
                    List<string> tmp = new List<string>(args);
                    tmp.RemoveAt(0);                   
                    obj.action(tmp.ToArray());
                    return;
                }
            }
            catch(System.FormatException e)
            {
                // We don't care, let's try by string instead
            }

            foreach(ApiObject obj in commands)
            {
                if (obj.name.ToLower().Equals(args[0].ToLower()))
                {
                    List<string> tmp = new List<string>(args);
                    tmp.RemoveAt(0);
                    obj.action(tmp.ToArray());
                    break;
                }
            }
        }
        #endregion

        #region API Mappings

        public static void InitialSetupWithCustomHost(String[] args)
        {
            validateArguments(args, 2);
            var newArgs = new List<String>(args);
            newArgs.RemoveAt(0);
            InitialSetupWithHost("https://" + args[0], newArgs.ToArray());
        }

        public static void InitialSetup(String[] args)
        {
            InitialSetupWithHost("https://www.sendsafely.com", args);
        }

        public static void InitialSetupWithHost(String apiHost, String[] args)
        {
            validateArguments(args, 1);
            Console.WriteLine("Connecting to " + apiHost);
            // Uncomment the below lines for proxy.
            /*
            Proxy proxy = new Proxy();
            proxy.Host = "10.0.2.2";
            proxy.Port = 8083;
            api.initialSetup(args[0], args[1], proxy);
            */

            //string apiHost = "https://www.sendsafely.com";

            if (args[0].Contains("@"))
            {
                string password = String.Empty;
                Console.Write("Password: ");
                ConsoleKeyInfo key;

                do
                {
                    key = Console.ReadKey(true);
                    if (key.Key != ConsoleKey.Backspace && key.Key != ConsoleKey.Enter)
                    {
                        password += key.KeyChar;
                        Console.Write("*");
                    }
                    else
                    {
                        if (key.Key == ConsoleKey.Backspace && password.Length > 0)
                        {
                            password = password.Substring(0, (password.Length - 1));
                            Console.Write("\b \b");
                        }
                    }
                }
                // Stops Receving Keys Once Enter is Pressed
                while (key.Key != ConsoleKey.Enter);
                Console.WriteLine();
                APICredential sessionCreds = null;
                api.InitialSetup(apiHost);
                try
                {
                    sessionCreds = api.GenerateAPIKey(args[0], password, "SendSafely CLI Key (auto generated)");
                }
                catch (SendSafely.Exceptions.TwoFactorAuthException te)
                {
                    Console.Write("Please enter your SMS verification code: ");
                    string input = Console.ReadLine();
                    sessionCreds = api.GenerateKey2FA(te.ValidationToken, input, "SendSafely CLI Key (auto generated)");
                }
                api.InitialSetup(apiHost, sessionCreds.APIKey, sessionCreds.APISecret);
            }
            else
            {
                Console.Write("API Secret: ");
                string apiSecret = Console.ReadLine();
                api.InitialSetup(apiHost, args[0], apiSecret);
            }
            Console.Write("Connected as " + api.VerifyCredentials() + "\n");
        }

        public static void VerifyVersion(String[] args)
        {
            Console.WriteLine(api.VerifyVersion());
        }

        public static void EnterpriseInformation(String[] args)
        {
            EnterpriseInformation info = api.GetEnterpriseInfo();
            Console.WriteLine(info.Host);
            Console.WriteLine(info.SystemName);
        }

        public static void CreatePackage(String[] args)
        {
            try
            {
                PackageInformation packageInfo = api.CreatePackage();
                packages.Add(packageInfo.PackageId, packageInfo);
                currentPackageId = packageInfo.PackageId;
                Console.WriteLine("Package ID " + packageInfo.PackageId + " created.");
            }
            catch (ActionFailedException e)
            {
                Console.WriteLine("Action Failed, message - {0}", e.Message);
            }
        }

        public static void GetPackageInfo(String[] args)
        {
            verifyPackageLoaded();
            try
            {
                PackageInformation info = packages[currentPackageId];
                info = api.GetPackageInformation(info.PackageId);

                Console.WriteLine("Package ID: {0}", info.PackageId);
                Console.WriteLine("Needs approver: {0}", info.NeedsApprover);
                if (info.Recipients != null)
                {
                    Console.WriteLine("Recipients:");
                    Console.WriteLine("---Email\tNeeds Approval");
                    foreach (Recipient r in info.Recipients)
                    {
                        Console.WriteLine("---{0}\t{1}", r.Email, r.NeedsApproval);
                    }
                }

                if(info.Files != null)
                {
                    Console.WriteLine("Files:");
                    foreach (File f in info.Files)
                    {
                        Console.WriteLine("\t{0}", f.FileName);
                    }
                }

                if (info.Approvers != null)
                {
                    Console.WriteLine("Approvers:");
                    foreach (String s in info.Approvers)
                    {
                        Console.WriteLine("\t{0}", s);
                    }
                }
            }
            catch (APINotInitializedException e)
            {
                Console.WriteLine("Exception: APINotInitializedException");
            }
        }

        public static void EncryptAndUploadFile(String[] args)
        {
            verifyPackageLoaded();
            //Disable call to validateArguments since it is not compatible with file names/paths that include a space 
            //validateArguments(args, 1);
            PackageInformation info = packages[currentPackageId];
            //Join args to support file names/paths that include a space 
            Console.WriteLine("Added File with ID " + api.EncryptAndUploadFile(info.PackageId, info.KeyCode, string.Join(" ", args).Replace("\"",""), new ProgressCallback()).FileId);
        }
        
        public static void DownloadPackageFiles(String[] args)
        {
            validateArguments(args, 2);
            string saveToPath = System.IO.Path.GetFullPath(args[1]);
            if (! System.IO.Directory.Exists(saveToPath))
            {
                throw new Exception("Error: " + saveToPath + " does not exist.");
            }
           
            PackageInformation info = api.GetPackageInformationFromLink(args[0]);

            if (info.IsWorkspace)
            {
                Directory rootDir = api.GetDirectory(info.PackageId, info.RootDirectoryId);
                Stack<String> parentDirectoryIdTracker = new Stack<String>();
                Stack<String> nestedFolderTracker = new Stack<String>();
                while (true)
                {
                    int count = 0;
                    foreach (SendSafely.Objects.DirectoryResponse subdir in rootDir.SubDirectories)
                    {                        
                        Console.WriteLine("[D](" + count + ") " + subdir.Name);
                        count++;
                    }
                    foreach (SendSafely.Objects.FileResponse file in rootDir.Files)
                    {
                        Console.WriteLine("[F](" + count + ") " + file.FileName );
                        count++;
                    }

                    if(count == 0)
                    {
                        Console.WriteLine("Directory (" + rootDir.DirectoryName + ") is empty.");
                    }
                    
                    String item = "";
                    int itemNumber = -2;

                    while(checkDownloadFileInput(item))
                    {
                        Console.WriteLine("Which item do you want to get? Key in number to download item or list folder contents or ALL to download all items for current folder. -1 to navigate to previous folder.");
                        item = Console.ReadLine();
                    }

                    if(!item.ToUpper().Equals("ALL"))
                    {
                        itemNumber = Int32.Parse(item);
                    }

                    if(itemNumber <= (rootDir.SubDirectories.Count -1) && itemNumber >= -1)
                    {
                        if(itemNumber == -1)
                        {
                            if(parentDirectoryIdTracker.Count > 0)
                            {
                                String directoryId = parentDirectoryIdTracker.Pop();
                                nestedFolderTracker.Pop();
                                rootDir = api.GetDirectory(info.PackageId, directoryId);
                            }
                            else
                            {
                                rootDir = api.GetDirectory(info.PackageId, rootDir.DirectoryId);
                            }
                        } else
                        {
                            SendSafely.Objects.DirectoryResponse directory = rootDir.SubDirectories[itemNumber];
                            parentDirectoryIdTracker.Push(rootDir.DirectoryId);                       
                            rootDir = api.GetDirectory(info.PackageId, directory.DirectoryId);
                            nestedFolderTracker.Push(rootDir.DirectoryName);
                            Console.WriteLine("Viewing directory (" + rootDir.DirectoryName +")");
                        }
                    } else if(itemNumber > (rootDir.SubDirectories.Count -1) && itemNumber <= ((rootDir.SubDirectories.Count-1) + (rootDir.Files.Count)))
                    {
                        itemNumber = itemNumber - rootDir.SubDirectories.Count;
                        SendSafely.Objects.FileResponse file = rootDir.Files[itemNumber];
                        Console.WriteLine(file.FileName);

                        string fullPath = createFolderIfDoesNotExists(saveToPath, nestedFolderTracker);
                        fullPath = System.IO.Path.Combine(fullPath, file.FileName);
                        

                        if (System.IO.File.Exists(fullPath))
                        {
                            while (true)
                            {
                                Console.WriteLine("The file: " + file.FileName + " already exist. Do you want to overwrite it? Y/N");
                                string overwrite = Console.ReadLine();
                                if (overwrite.ToUpper().Equals("Y"))
                                {
                                    downloadFileFromDirectory(fullPath, file.FileName, 0, 0, info.PackageId, rootDir.DirectoryId, file.FileId, info.KeyCode, true);
                                    break;
                                }
                                else if (overwrite.ToUpper().Equals("N"))
                                {
                                    Console.WriteLine("Skipping " + file.FileName);
                                    break;
                                }
                                else
                                {
                                    Console.WriteLine("The file: " + file.FileName + " already exist. Do you want to overwrite it? Y/N");
                                    overwrite = Console.ReadLine();
                                    continue; 
                                }
                            }
                        }
                        else
                        {
                            downloadFileFromDirectory(fullPath, file.FileName, 0, 0, info.PackageId, rootDir.DirectoryId, file.FileId, info.KeyCode, false);
                        }
                    } else if(item.ToUpper().Equals("ALL"))
                    {
                        if(rootDir.Files.Count > 0)
                        {
                            bool overrideAll = false;
                            int downloadCount = 0;
                            int totalFilesCount = rootDir.Files.Count;
                            string fullPath = createFolderIfDoesNotExists(saveToPath, nestedFolderTracker);                          

                            foreach (SendSafely.Objects.FileResponse file in rootDir.Files)
                            {
                                downloadCount++;
                                string filePath = System.IO.Path.Combine(fullPath, file.FileName);
                                Console.WriteLine(filePath);
                                if (System.IO.File.Exists(filePath) && !overrideAll)
                                {
                                    while (true)
                                    {
                                        Console.WriteLine("The file: " + file.FileName + " already exist. Do you want to overwrite it? Y/N or O to [O]verwrite all files.");
                                        string overwrite = Console.ReadLine();
                                        if (overwrite.ToUpper().Equals("Y") || overwrite.ToUpper().Equals("O"))
                                        {
                                            downloadFileFromDirectory(filePath, file.FileName, downloadCount, totalFilesCount, info.PackageId, rootDir.DirectoryId, file.FileId, info.KeyCode, true);

                                            if (overwrite.ToUpper().Equals("O"))
                                            {
                                                overrideAll = true;
                                            }

                                            break;
                                        }
                                        else if (overwrite.ToUpper().Equals("N"))
                                        {
                                            Console.WriteLine("Skipping " + file.FileName);
                                            break;
                                        }
                                        else
                                        {
                                            Console.WriteLine("The file: " + file.FileName + " already exist. Do you want to overwrite it? Y/N");
                                            overwrite = Console.ReadLine();
                                            continue; 
                                        }
                                    }
                                }
                                else
                                {
                                    downloadFileFromDirectory(filePath, file.FileName, downloadCount, totalFilesCount, info.PackageId, rootDir.DirectoryId, file.FileId, info.KeyCode, overrideAll);  
                                }
                            }
                        }
                        else
                        {
                            Console.WriteLine("Current directory (" + rootDir.DirectoryName + ") has no file(s) to download.");
                        }
                    }
                    
                    //If we make it here, repeat     
                        continue; 
                    
                }
            }
            else
            {
                foreach (File file in info.Files)
                {

                    string fullpath = System.IO.Path.Combine(saveToPath, file.FileName);

                    if (System.IO.File.Exists(fullpath))
                    {
                        while (true)
                        {
                            Console.WriteLine("The file: " + file.FileName + " already exist. Do you want to overwrite it? Y/N");
                            string overwrite = Console.ReadLine();
                            if (overwrite.ToUpper().Equals("Y"))
                            {
                                System.IO.File.Delete(fullpath);
                                Console.WriteLine("Downloading file " + file.FileName);
                                System.IO.FileInfo newFile = api.DownloadFile(info.PackageId, file.FileId, info.KeyCode, new DownloadProgressCallback());
                                System.IO.File.Move(newFile.FullName, fullpath);
                                Console.WriteLine();
                                Console.WriteLine("Download complete, file saved to " + fullpath);
                                break;
                            }
                            else if (overwrite.ToUpper().Equals("N"))
                            {
                                Console.WriteLine("Skipping " + file.FileName);
                                break;
                            }
                            else
                            {
                                Console.WriteLine("The file: " + file.FileName + " already exist. Do you want to overwrite it? Y/N");
                                overwrite = Console.ReadLine();
                                continue; 
                            }
                        }
                    }
                    else
                    {
                        Console.WriteLine("Downloading file " + file.FileName);
                        System.IO.FileInfo newFile = api.DownloadFile(info.PackageId, file.FileId, info.KeyCode, new DownloadProgressCallback());
                        System.IO.File.Move(newFile.FullName, fullpath);
                        Console.WriteLine();
                        Console.WriteLine("Download complete, file saved to " + fullpath);
                    }
                }
                Console.Write("All downloads are complete.");
            }
        }

        public static void AddRecipient(String[] args)
        {
            verifyPackageLoaded();
            validateArguments(args, 1);
                try
                {
                    PackageInformation info = packages[currentPackageId];
                    Console.WriteLine("Added Recipient with ID: {0}", api.AddRecipient(info.PackageId, args[0]).RecipientId);
                }
                catch (APINotInitializedException e)
                {
                    Console.WriteLine("Exception: APINotInitializedException");
                }
                catch (ActionFailedException e)
                {
                    Console.WriteLine("Exception: ActionFailedException");
                    Console.WriteLine("Error: {0}", e.Reason);
                    Console.WriteLine("Message: {0}", e.Message);
                }
        }

        public static void FinalizePackage(String[] args)
        {
            verifyPackageLoaded();
            PackageInformation info = packages[currentPackageId];
            Console.WriteLine(api.FinalizePackage(info.PackageId, info.KeyCode));
        }

        public static void DeletePackage(String[] args)
        {
            verifyPackageLoaded();
            validateArguments(args, 0);
            PackageInformation info = packages[currentPackageId];
            api.DeleteTempPackage(info.PackageId);
            Console.WriteLine("Package " + info.PackageId + " deleted.");
        }

        #endregion

        public static void validateArguments(string[] args, int required)
        {
            if (args.Length != required)
            {
                throw new Exception("Error: You must provide " + required + " values. (" + args.Length + ")\n");
            }
        }

        public static void verifyPackageLoaded()
        {
            if (currentPackageId == null)
            {
                throw new Exception("Error: No package loaded. Use CreatePackage or LoadPackage first.\n");
            }
        }

        private static bool checkDownloadFileInput(String value)
        {
            if(value.ToUpper().Equals("ALL"))
            {
                return false;
            } else if(!Int32.TryParse(value, out int none))
            {
                return true;
            }

            return false;
        }

        private static string createFolderIfDoesNotExists(string saveToPath, Stack<string> nestedFolderTracker)
        {
            string fullPath = saveToPath;

            if (nestedFolderTracker.Count > 0)
            {
                string[] nestedFolderArray = nestedFolderTracker.ToArray();
                Array.Reverse(nestedFolderArray);
                fullPath = System.IO.Path.Combine(nestedFolderArray);
                fullPath = System.IO.Path.Combine(saveToPath, fullPath);

                if (!System.IO.Directory.Exists(fullPath))
                {
                    System.IO.Directory.CreateDirectory(fullPath);
                }
            }                  
            return fullPath;
        }

        private static void downloadFileFromDirectory(string filePath, string fileName, int downloadCount, int totalFilesCount, string packageId, string directoryId, string fileId, string keyCode, bool overrideAll)
        {
            if (overrideAll)
            {
                System.IO.File.Delete(filePath);
            }
            string fileDownloadMessage = "Downloading file " + fileName + " (" + downloadCount + " of " + totalFilesCount + ")";

            if(downloadCount == 0 && totalFilesCount == 0)
            {
                fileDownloadMessage = "Download file " + fileName;
            }

            Console.WriteLine(fileDownloadMessage);
            System.IO.FileInfo newFile = api.DownloadFileFromDirectory(packageId, directoryId, fileId, keyCode, new DownloadProgressCallback());
            System.IO.File.Move(newFile.FullName, filePath);
            Console.WriteLine();
            Console.WriteLine("Download complete, file saved to " + filePath);
        }
    }
}
