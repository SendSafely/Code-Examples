using System;
using System.Collections.Generic;
using System.Text;

namespace SendSafelyCLI
{
    class ApiObject
    {

        public ApiObject(string name, string description, Action<String[]> action)
        {
            this.name = name;
            this.description = description;
            this.action = action;
        }

        public string name { get; set; }
        public string description { get; set; }
        public Action<String[]> action { get; set; }
    }
}
