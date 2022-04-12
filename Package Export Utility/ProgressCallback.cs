using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using SendSafely;

namespace SendSafelyExportUtility
{
    class ProgressCallback : ISendSafelyProgress
    {
        public void UpdateProgress(string prefix, double progress)
        {
            //Console.WriteLine(prefix + " " + progress + "%");
            Console.Write(".");
        }
    }
}
