using BulldogFinance.Functions.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Services
{
    public interface IMcpChatService
    {
        Task<string> ChatAsync(string userId, ChatRequest request, CancellationToken ct = default);
    }
}
