namespace BulldogFinance.Functions.Services.Plaid
{
    public interface IPlaidTokenProtector
    {
        string Protect(string plainText);

        string Unprotect(string cipherText);
    }
}
