using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Models.Chat
{
    public enum ChatIntentType
    {
        Unknown = 0,
        General = 1,
        Portfolio = 2,
        Transactions = 3,
        Accounts = 4,
        Watchlist = 5,
        InvestmentResearch = 6,
        Report = 7
    }
}
