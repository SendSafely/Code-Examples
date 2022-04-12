using System;
using System.Collections.Generic;
using System.Text;

namespace SendSafelyCLI
{
    class Program
    {
        static void Main(string[] args)
        {
            ApiHandler api = new ApiHandler();

            Console.WriteLine("-----------------------------------");
            Console.WriteLine("| SendSafely CLI v1.1.1           |");
            Console.WriteLine("| support@sendsafely.com          |");
            Console.WriteLine("-----------------------------------");
            while (true)
            {
                Console.WriteLine("Type 'help' for available commands");
                string input = Console.ReadLine();
                if (input.Equals("help"))
                {
                    Console.WriteLine("Available commands:");
                    Console.WriteLine(api.getAvailableCommands());
                    Console.WriteLine();
                }
                else
                {
                    try
                    {
                        api.parseCommand(input);
                    }
                    catch (SendSafely.Exceptions.APINotInitializedException)
                    {
                        Console.WriteLine("Error: Not connected. Use command 0 to connect.\n");
                    }
                    catch (SendSafely.Exceptions.PackageFinalizationException)
                    {
                        Console.WriteLine("Error: Could not generate link. Make sure you have added at least one file and one recipient.\n");
                    }
                    catch (Exception e)
                    {
                        Console.WriteLine("Error: " + e.Message);
                        //Console.WriteLine(e.StackTrace);
                    }
                }
            }
        }


    }
}
