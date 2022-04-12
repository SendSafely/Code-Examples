using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;
using SendSafely;
using SendSafely.Objects;
using SendSafely.Utilities;

namespace SendSafelyExportUtility
{
    class Program
    {
        private static List<PackageInformation> packages = new List<PackageInformation>();
        private static ClientAPI sendSafely = new ClientAPI();
        private static void getOrganizationPackages(DateTime fromDate, DateTime toDate, int rowIndex)
        {
            PaginatedList<PackageInformation> results = sendSafely.GetOrganizationPackagesSearch(fromDate, toDate, null, null, null, null, rowIndex, 100);
            packages.AddRange(results);
            Console.WriteLine(rowIndex + results.RowsReturned + " items returned so far...");
            if (results.NextRowIndex == rowIndex + results.RowsReturned)
            {
                getOrganizationPackages(fromDate, toDate, results.NextRowIndex);
            }
        }

        // This is a sample console application designed to show basic use of the SendSafely .NET API
        static void Main(string[] args)
        {
      
            String archivePath = System.AppContext.BaseDirectory;
                        
            String fileVersion = System.Diagnostics.FileVersionInfo.GetVersionInfo(System.Reflection.Assembly.GetExecutingAssembly().Location).FileVersion;
            Console.WriteLine("\nSendSafely Export Utility " + fileVersion + "\n");
            if (args.Length == 1 && args[0].ToString().Equals("-genOrgKey"))
            {
                Console.WriteLine("Generating new enterprise key pair");
                String currentTimestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
                CryptUtility cu = new CryptUtility();
                Keypair keyPair = cu.GenerateKeyPair("no-reply@sendsafely.com");
                System.IO.File.WriteAllText(archivePath + currentTimestamp + ".private_key.txt", keyPair.PrivateKey);
                System.IO.File.WriteAllText(archivePath + currentTimestamp + ".public_key.txt", keyPair.PublicKey);
                Console.WriteLine("A new key pair has been written to " + currentTimestamp + ".private_key.txt and " + currentTimestamp + ".public_key.txt");
                Console.ReadLine();
                return;
            }
            else if (args.Length == 4 && args[0].ToString().Equals("-genUserKey"))
            {
                Console.WriteLine("Generating new user key pair");
                sendSafely.InitialSetup(args[1], args[2], args[3]);
                Console.WriteLine("Connected to SendSafely as user: " + sendSafely.VerifyCredentials());

                try
                {
                    PrivateKey pKey = sendSafely.GenerateKeyPair("SendSafely Export Utility");
                    Console.WriteLine("A new public key has been generated and uploaded to SendSafely (Key ID# " + pKey.PublicKeyID + ")");
                    System.IO.File.WriteAllText(archivePath + pKey.PublicKeyID + ".private_key.txt", pKey.ArmoredKey);
                    Console.WriteLine("A new private key has been written to " + pKey.PublicKeyID + ".private_key.txt");
                }
                catch (Exception e)
                {
                    Console.WriteLine(e.Message);
                }
               
                return;
            }
            else if ((args.Length == 6 || args.Length == 7) && args[0].ToString().Equals("-exportUserPackages"))
            {
                Console.WriteLine("Starting user package export");
                sendSafely.InitialSetup(args[1], args[2], args[3]);
                Console.WriteLine("Connected to SendSafely as user: " + sendSafely.VerifyCredentials());
                packages = sendSafely.GetActivePackages();
                packages.AddRange(sendSafely.GetReceivedPackages());

                if (args.Length == 7)
                {
                    archivePath = args[6];
                }
            }
            else if ((args.Length == 8 || args.Length == 9) && args[0].ToString().Equals("-exportOrgPackages"))
            {
                Console.WriteLine("Starting enterprise package export");
                sendSafely.InitialSetup(args[1], args[2], args[3]);
                Console.WriteLine("Connected to SendSafely as user: " + sendSafely.VerifyCredentials());
                String fromDateString = args[6];
                String toDateString = args[7];

                //Run the org search 
                DateTime fromDate = DateTime.ParseExact(fromDateString, "MM/dd/yyyy", System.Globalization.CultureInfo.InvariantCulture);
                DateTime toDate = DateTime.ParseExact(toDateString, "MM/dd/yyyy", System.Globalization.CultureInfo.InvariantCulture);

                Console.WriteLine("Running activity search...");
                getOrganizationPackages(fromDate, toDate, 0);
               
                if (packages.Count >= 10000)
                {
                    Console.WriteLine("Too many items found, reduce your date range and try again.");
                    Console.ReadLine();
                    return;
                }
                else
                {
                    Console.WriteLine("Search complete. " + packages.Count + " items found.");
                }

                if (args.Length == 9)
                {
                    archivePath = args[8];
                }
            }
            else
            {
                Console.WriteLine("Use one of the following commands: -exportOrgPackages, -exportUserPackages, -genUserKey, -genOrgKey");
                Console.WriteLine("Refer to the help documents for more info on each command");

                Console.WriteLine();
                Console.WriteLine("Number of Parameters: " + args.Length);
                Console.WriteLine("Values: " + JsonConvert.SerializeObject(args)); 
                return;
            }

            //If we make it this far, we are doing an export
            archivePath += "export";
            Console.WriteLine("Saving files to " + archivePath);
            //Create a Private Key object 
            SendSafely.PrivateKey pk = new PrivateKey();
            pk.ArmoredKey = System.IO.File.ReadAllText(args[4]);
            pk.PublicKeyID = args[5];
            String me = sendSafely.VerifyCredentials();

            //Loop through search results and process each packge 
            foreach (PackageInformation pInfo in packages)
            {
                if (!System.IO.Directory.Exists(archivePath + "\\" + pInfo.PackageId))
                {
                    Console.WriteLine("Starting Package ID# " + pInfo.PackageId + " (" + pInfo.PackageOwner + ") sent on " + pInfo.PackageTimestamp);
                    int originalPackageLife = 0;

                    //Make a new directory to store the package contents 
                    if (System.IO.Directory.Exists(archivePath + "\\_" + pInfo.PackageId))
                    {
                        //Delete the old working directory if there was one (must have been a failure of some sort)
                        System.IO.Directory.Delete(archivePath + "\\_" + pInfo.PackageId, true);
                    }
                    System.IO.Directory.CreateDirectory(archivePath + "\\_" + pInfo.PackageId);

                    try
                    {
                        if (!pInfo.Status.Equals(PackageStatus.ACTIVE))
                        {
                            //Package is not active. Re-activate for download
                            if (pInfo.Status.Equals(PackageStatus.EXPIRED))
                            {
                                //Package is expired, reactivate by setting life to 0 
                                originalPackageLife = pInfo.Life;
                                sendSafely.UpdatePackageLife(pInfo.PackageId, 0);
                            }
                            else
                            {
                                String errorMessage = "Package is Deleted - Unable to Archive Package ID# " + pInfo.PackageId + " (" + pInfo.PackageOwner + ")";
                                Console.WriteLine(errorMessage);
                                System.IO.File.WriteAllText(archivePath + "\\_" + pInfo.PackageId + "\\error.txt", errorMessage);
                                continue;
                            }
                        }

                        String keycode = String.Empty;
                        //Now fetch the keycode 
                        try
                        {
                            keycode = sendSafely.GetKeycode(pk, pInfo.PackageId);
                        }
                        catch (SendSafely.Exceptions.GettingKeycodeFailedException e)
                        {
                            String errorMessage = "No Keycode Found - Unable to Archive Package ID# " + pInfo.PackageId + " (" + pInfo.PackageOwner + ")";
                            Console.WriteLine(errorMessage);
                            System.IO.File.WriteAllText(archivePath + "\\_" + pInfo.PackageId + "\\error.txt", errorMessage);
                            continue;
                        }


                        //Are we a recipient? If not add ourselves 
                        Boolean isOriginalRecipient = false;
                        Recipient newRecipientAdded = null;

                        bool isAnonymousPackage = false;
                        if (pInfo.Recipients.Count > 0)
                        {
                            if (pInfo.Recipients[0].Email.Equals("Anonymous Recipient"))
                            {
                                isAnonymousPackage = true;
                            }
                            else
                            {
                                foreach (Recipient r in pInfo.Recipients)
                                {
                                    if (r.Email.ToLowerInvariant().Equals(me.ToLowerInvariant()))
                                    {
                                        isOriginalRecipient = true;
                                        break;
                                    }
                                }
                            }
                        }
                        else
                        {
                            //If there are no recipients, this is a user-level item from the recieved packages list
                            //Assume we are a recipient
                            isOriginalRecipient = true;
                        }

                        if (!isOriginalRecipient && !isAnonymousPackage)
                        {
                            newRecipientAdded = sendSafely.AddRecipient(pInfo.PackageId, me.ToLowerInvariant());
                        }

                        //Check for a messsage 
                        try
                        {
                            String packageLink = sendSafely.GetPackageLink(pInfo.PackageId, keycode);
                            String message = sendSafely.GetMessage(packageLink);
                            if (message != null)
                            {
                                Console.WriteLine("Saving Message: " + archivePath + "\\_" + pInfo.PackageId + "\\" + pInfo.PackageId + ".message.txt");
                                System.IO.File.WriteAllText(archivePath + "\\_" + pInfo.PackageId + "\\" + pInfo.PackageId + ".message.txt", message);
                            }
                            else
                            {
                                //Console.WriteLine("Message is Null");
                            }

                        }
                        catch (SendSafely.Exceptions.InvalidLinkException)
                        {
                            //Console.WriteLine("Invalid Link Exception");
                        }

                        PackageInformation fullPackageInfo = sendSafely.GetPackageInformation(pInfo.PackageId);

                        // Download all files found in the package
                        foreach (File file in fullPackageInfo.Files)
                        {
                            Console.WriteLine("Downloading file: " + file.FileName + " [File Size: " + file.FileSize + "]");
                            Console.WriteLine(keycode);
                            System.IO.FileInfo fileInfo = sendSafely.DownloadFile(pInfo.PackageId, file.FileId, keycode, new ProgressCallback());
                            fileInfo.MoveTo(archivePath + "\\_" + pInfo.PackageId + "\\" + file.FileName);
                            Console.WriteLine();
                            Console.WriteLine("File saved: " + archivePath + "\\_" + pInfo.PackageId + "\\" + file.FileName);
                        }
                        if (originalPackageLife > 0)
                        {
                            //Reset package life to original value 
                            sendSafely.UpdatePackageLife(pInfo.PackageId, originalPackageLife);
                        }

                        if (!isOriginalRecipient && !isAnonymousPackage)
                        {
                            //Remove ourself if we added ourself 
                            sendSafely.RemoveRecipient(pInfo.PackageId, newRecipientAdded.RecipientId);
                        }

                        //  We are done, move out of working directory into permanent dir
                        System.IO.Directory.Move(archivePath + "\\_" + pInfo.PackageId, archivePath + "\\" + pInfo.PackageId);
                    }
                    catch (Exception e)
                    {
                        String errorMessage = "Unhandled exception when accessing Package ID# " + pInfo.PackageId + " (" + pInfo.PackageOwner + ") - " + e.Message;
                        Console.WriteLine(errorMessage);
                        System.IO.File.WriteAllText(archivePath + "\\_" + pInfo.PackageId + "\\error.txt", errorMessage);
                        System.IO.File.AppendAllText(archivePath + "\\_" + pInfo.PackageId + "\\error.txt", e.Message);
                        System.IO.File.AppendAllText(archivePath + "\\_" + pInfo.PackageId + "\\error.txt", e.StackTrace);
                        continue;
                    }
                    
                }
                else
                {
                    Console.WriteLine("Skipping Package ID# " + pInfo.PackageId);
                }
            }
            Console.WriteLine("DONE");
        }
    }

   
}