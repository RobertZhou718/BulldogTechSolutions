using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.McpServer.Clients
{
    public interface IFinanceBackendClient
    {
        Task<string> GetAccountsAsync(string userId, CancellationToken cancellationToken = default);
    }
}
