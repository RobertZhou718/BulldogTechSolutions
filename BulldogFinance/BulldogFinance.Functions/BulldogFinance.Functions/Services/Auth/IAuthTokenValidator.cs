namespace BulldogFinance.Functions.Services.Auth
{
    public interface IAuthTokenValidator
    {
        Task<AuthTokenValidationResult> ValidateAsync(string bearerToken, CancellationToken cancellationToken = default);
    }
}
