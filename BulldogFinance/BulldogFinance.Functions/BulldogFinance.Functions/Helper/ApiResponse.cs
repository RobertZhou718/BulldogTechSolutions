using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Helper
{
    /// <summary>
    /// Unified JSON error response helper for all business-logic Functions.
    /// </summary>
    /// <remarks>
    /// All errors are serialized as:
    /// { "error": { "code": "...", "message": "..." } }
    /// </remarks>
    public static class ApiResponse
    {
        private static readonly JsonSerializerOptions JsonOptions = JsonDefaults.Api;

        public static Task<HttpResponseData> OkAsync(
            HttpRequestData req,
            object payload,
            CancellationToken ct = default)
            => JsonAsync(req, HttpStatusCode.OK, payload, ct);

        public static async Task<HttpResponseData> JsonAsync(
            HttpRequestData req,
            HttpStatusCode statusCode,
            object payload,
            CancellationToken ct = default)
        {
            var response = req.CreateResponse(statusCode);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(payload, JsonOptions), ct);
            return response;
        }

        public static HttpResponseData NoContent(HttpRequestData req)
            => req.CreateResponse(HttpStatusCode.NoContent);

        public static Task<HttpResponseData> UnauthorizedAsync(
            HttpRequestData req,
            CancellationToken ct = default)
            => ErrorAsync(req, HttpStatusCode.Unauthorized, "unauthorized", "Unauthorized.", ct);

        public static Task<HttpResponseData> NotFoundAsync(
            HttpRequestData req,
            string message,
            CancellationToken ct = default)
            => ErrorAsync(req, HttpStatusCode.NotFound, "not_found", message, ct);

        public static Task<HttpResponseData> BadRequestAsync(
            HttpRequestData req,
            string message,
            CancellationToken ct = default)
            => ErrorAsync(req, HttpStatusCode.BadRequest, "bad_request", message, ct);

        public static Task<HttpResponseData> ConflictAsync(
            HttpRequestData req,
            string message,
            CancellationToken ct = default)
            => ErrorAsync(req, HttpStatusCode.Conflict, "conflict", message, ct);

        public static Task<HttpResponseData> BadGatewayAsync(
            HttpRequestData req,
            string message,
            CancellationToken ct = default)
            => ErrorAsync(req, HttpStatusCode.BadGateway, "bad_gateway", message, ct);

        public static Task<HttpResponseData> InternalErrorAsync(
            HttpRequestData req,
            string message,
            CancellationToken ct = default)
            => ErrorAsync(req, HttpStatusCode.InternalServerError, "internal_error", message, ct);

        public static async Task<HttpResponseData> ErrorAsync(
            HttpRequestData req,
            HttpStatusCode statusCode,
            string code,
            string message,
            CancellationToken ct = default)
        {
            var response = req.CreateResponse(statusCode);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(
                JsonSerializer.Serialize(new { error = new { code, message } }, JsonOptions),
                ct);
            return response;
        }
    }
}
