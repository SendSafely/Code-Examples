using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using SendSafely;
using System.IO;

namespace SendSafelyConsoleApplication
{
    class Program
    {
        // This is a sample console application designed to show basic use of the SendSafely .NET API
        static void Main(string[] args)
        {
            /*
             * This example will read in the following command line arguments:
             *
             *        SendSafelyHost: The SendSafely hostname to connect to.  Enterprise users should connect to their designated 
             *                        Enterprise host (company-name.sendsafely.com)
             *
             *            UserApiKey: The API key for the user you want to connect to.  API Keys can be obtained from the Edit 
             *                        Profile screen when logged in to SendSafely
             *
             *         UserApiSecret: The API Secret associated with the API Key used above.  The API Secret is provided to  
             *                        you when you generate a new API Key.  
             *
             *               COMMAND: The command to perform, must be either CREATE-KEY, LIST-PACKAGES or GET-FILES
             *
             *               KeyFile: Your SendSafely Private Key (only used with GET-FILES). A Private Key can be generated using CREATE-KEY 
             *
             *                 KeyId: The KeyId associated with your SendSafely Private Key. A Private Key can be generated using CREATE-KEY 
             *                 
             *             PackageId: The PackageId to download files from. All files will be stored in a directory named with the PackageId.   
             */

            if (args == null || (args.Length != 4 && args.Length != 7) || (!args[3].ToString().ToUpper().Equals("CREATE-KEY") && !args[3].ToString().ToUpper().Equals("LIST-PACKAGES") && !args[3].ToString().ToUpper().Equals("GET-FILES")))
            {
                // Invalid number of arguments.  Print the usage syntax to the screen and exit. 
                Console.WriteLine("Usage:\n");
                Console.WriteLine(System.IO.Path.GetFileName(System.Diagnostics.Process.GetCurrentProcess().MainModule.FileName) + " SendSafelyHost UserApiKey UserApiSecret CREATE-KEY\n\n");
                Console.WriteLine(System.IO.Path.GetFileName(System.Diagnostics.Process.GetCurrentProcess().MainModule.FileName) + " SendSafelyHost UserApiKey UserApiSecret LIST-PACKAGES\n\n");
                Console.WriteLine(System.IO.Path.GetFileName(System.Diagnostics.Process.GetCurrentProcess().MainModule.FileName) + " SendSafelyHost UserApiKey UserApiSecret GET-FILES KeyFile KeyId PackageId\n");
                return;
            }
            else
            {
                // Valid arguments provided.  Assign each argument to a local variable 
                String sendSafelyHost = args[0];
                String userApiKey = args[1];
                String userApiSecret = args[2];
                String command = args[3].ToUpper();

                // Initialize the API 
                Console.WriteLine("Initializing API");
                ClientAPI ssApi = new ClientAPI();
                ssApi.InitialSetup(sendSafelyHost, userApiKey, userApiSecret);

                try
                {
                    // Verify the API key and Secret before continuing.  
                    // Print the authenticated user's email address to the screen if valid. 
                    String userEmail = ssApi.VerifyCredentials();
                    Console.WriteLine("Connected to SendSafely as user " + userEmail);

                    if (command.Equals("CREATE-KEY"))
                    {
                        PrivateKey pk = ssApi.GenerateKeyPair("Trusted Key for API Integration");
                        Console.WriteLine(pk.ArmoredKey);
                        Console.WriteLine(pk.PublicKeyID);
                        System.IO.File.WriteAllText(pk.PublicKeyID + ".key", pk.ArmoredKey);
                    } 
                    else if (command.Equals("LIST-PACKAGES"))
                    {
                        List<PackageInformation> packageList = ssApi.GetReceivedPackages();
                        foreach (PackageInformation p in packageList)
                        {
                            Console.WriteLine(p.PackageId + " " + p.PackageTimestamp);
                        }
                    }
                    else if (command.Equals("GET-FILES"))
                    {
                        string packageId = args[6].ToString();
                        PackageInformation pInfo = ssApi.GetPackageInformation(packageId);
                        string keyFileText = System.IO.File.ReadAllText(args[4].ToString());
                        string keyId = args[5].ToString();

                        foreach (SendSafely.File f in pInfo.Files)
                        {
                            Console.WriteLine("Downloading file " + f.FileName);
                            PrivateKey pk = new PrivateKey();
                            pk.PublicKeyID = keyId;
                            pk.ArmoredKey = keyFileText;
                            String keyCode = ssApi.GetKeycode(pk, packageId);
                            FileInfo newFile = ssApi.DownloadFile(packageId, f.FileId, keyCode, new ProgressCallback());
                            System.IO.Directory.CreateDirectory(packageId);
                            newFile.MoveTo(packageId + "\\" + f.FileName);
                        }
                    }
                   
                }
                catch (SendSafely.Exceptions.BaseException ex)
                {
                    Console.WriteLine("Error: " + ex.Message);
                }
            }
        }
    }
}
