using System.Net;
using Going.Plaid.Entity;

namespace BulldogFinance.Functions.Services.Plaid
{
    public sealed class PlaidApiException : InvalidOperationException
    {
        public PlaidApiException(
            string path,
            HttpStatusCode statusCode,
            PlaidError? error,
            string? rawJson)
            : base(CreateMessage(path, statusCode, error, rawJson))
        {
            Path = path;
            StatusCode = statusCode;
            ErrorType = error?.ErrorType;
            ErrorCode = error?.ErrorCode;
            PlaidErrorMessage = error?.ErrorMessage;
            DisplayMessage = error?.DisplayMessage;
            RequestId = error?.RequestId;
        }

        public string Path { get; }

        public HttpStatusCode StatusCode { get; }

        public string? ErrorType { get; }

        public string? ErrorCode { get; }

        public string? PlaidErrorMessage { get; }

        public string? DisplayMessage { get; }

        public string? RequestId { get; }

        public bool RequiresLinkUpdate =>
            string.Equals(ErrorCode, "ITEM_LOGIN_REQUIRED", StringComparison.OrdinalIgnoreCase);

        private static string CreateMessage(
            string path,
            HttpStatusCode statusCode,
            PlaidError? error,
            string? rawJson)
        {
            var detail = error != null
                ? $"{error.ErrorType}/{error.ErrorCode}: {error.ErrorMessage}"
                : rawJson ?? "Unknown error";

            return $"Plaid API {path} failed: {(int)statusCode} {detail}";
        }
    }
}
