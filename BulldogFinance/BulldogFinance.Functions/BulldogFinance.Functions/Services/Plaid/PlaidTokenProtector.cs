using Microsoft.AspNetCore.DataProtection;

namespace BulldogFinance.Functions.Services.Plaid
{
    public class PlaidTokenProtector : IPlaidTokenProtector
    {
        private readonly IDataProtector _protector;

        public PlaidTokenProtector(IDataProtectionProvider dataProtectionProvider)
        {
            _protector = dataProtectionProvider.CreateProtector("BulldogFinance.Plaid.AccessToken");
        }

        public string Protect(string plainText) => _protector.Protect(plainText);

        public string Unprotect(string cipherText) => _protector.Unprotect(cipherText);
    }
}
