using System;
using System.Collections.Generic;
using System.Text;
using SendSafely;

namespace SendSafelyCLI
{
    class ProgressCallback : ISendSafelyProgress
    {
        public void UpdateProgress(string prefix, double progress)
        {
            Console.Write("\r" + prefix + " " + Math.Round(progress, 2) + "%");
        }
    }
}
