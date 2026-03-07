using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.McpServer.Config
{
    public sealed class McpOptions
    {
        public string FinanceBackendBaseUrl { get; set; } = string.Empty;
        public string? FinanceBackendApiKey { get; set; }
    }
}
