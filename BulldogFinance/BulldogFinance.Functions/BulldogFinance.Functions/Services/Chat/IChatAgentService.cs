using BulldogFinance.Functions.Models.Chat;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Services.Chat
{
    public interface IChatAgentService
    {
        Task<string> ChatAsync(string userId,ChatRequest request,CancellationToken ct = default);
    }
}
