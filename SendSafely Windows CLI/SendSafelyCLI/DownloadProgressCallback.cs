using System;
using System.Collections.Generic;
using System.Text;
using SendSafely;

namespace SendSafelyCLI
{
    class DownloadProgressCallback : ISendSafelyProgress
    {
        double lastProgress = 0;
        double floor = 0;

        public void UpdateProgress(string prefix, double progress)
        {
            if (lastProgress > progress)
            {
                //Increment floor
                floor = floor + lastProgress;
            }
            lastProgress = progress;

            double displayProgress = floor + progress;

            Console.Write("\r" + prefix + " " + String.Format("{0:0.00}", Math.Round(displayProgress, 2)) + "%");
        }
    }
}
