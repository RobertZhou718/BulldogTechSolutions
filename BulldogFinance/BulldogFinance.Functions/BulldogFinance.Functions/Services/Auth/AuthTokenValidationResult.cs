using System.Net;
using System.Security.Claims;

namespace BulldogFinance.Functions.Services.Auth
{
    public sealed class AuthTokenValidationResult
    {
        public bool IsAuthenticated { get; init; }

        public string? UserId { get; init; }

        public ClaimsPrincipal? Principal { get; init; }

        public HttpStatusCode StatusCode { get; init; } = HttpStatusCode.Unauthorized;

        public string? ErrorMessage { get; init; }

        public static AuthTokenValidationResult Success(string userId, ClaimsPrincipal principal)
        {
            return new AuthTokenValidationResult
            {
                IsAuthenticated = true,
                UserId = userId,
                Principal = principal,
                StatusCode = HttpStatusCode.OK
            };
        }

        public static AuthTokenValidationResult Failure(HttpStatusCode statusCode, string errorMessage)
        {
            return new AuthTokenValidationResult
            {
                IsAuthenticated = false,
                StatusCode = statusCode,
                ErrorMessage = errorMessage
            };
        }
    }
}
