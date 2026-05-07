using System.Text.Json;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Helper
{
    public enum JsonBodyError
    {
        None,
        Empty,
        Invalid
    }

    public readonly record struct JsonBodyResult<T>(T? Value, JsonBodyError Error)
    {
        public bool IsEmpty => Error == JsonBodyError.Empty;
        public bool IsInvalid => Error == JsonBodyError.Invalid;
        public bool IsMissingOrInvalid => Error != JsonBodyError.None;
    }

    public static class HttpRequestExtensions
    {
        /// <summary>
        /// Read and JSON-deserialize the request body using the shared API options.
        /// Caller decides how to map empty vs. invalid bodies into HTTP responses.
        /// </summary>
        public static async Task<JsonBodyResult<T>> ReadJsonBodyAsync<T>(
            this HttpRequestData req,
            CancellationToken cancellationToken = default)
        {
            using var reader = new StreamReader(req.Body);
            var body = await reader.ReadToEndAsync(cancellationToken);

            if (string.IsNullOrWhiteSpace(body))
            {
                return new JsonBodyResult<T>(default, JsonBodyError.Empty);
            }

            try
            {
                var value = JsonSerializer.Deserialize<T>(body, JsonDefaults.Api);
                return value is null
                    ? new JsonBodyResult<T>(default, JsonBodyError.Invalid)
                    : new JsonBodyResult<T>(value, JsonBodyError.None);
            }
            catch (JsonException)
            {
                return new JsonBodyResult<T>(default, JsonBodyError.Invalid);
            }
        }

        /// <summary>
        /// Same as <see cref="ReadJsonBodyAsync{T}"/> but returns a parsed
        /// <see cref="JsonDocument"/> for endpoints that need to inspect raw fields
        /// alongside a typed model. Caller is responsible for disposing the document.
        /// </summary>
        public static async Task<(JsonDocument? Document, string? RawBody, JsonBodyError Error)>
            ReadJsonDocumentAsync(
                this HttpRequestData req,
                CancellationToken cancellationToken = default)
        {
            using var reader = new StreamReader(req.Body);
            var body = await reader.ReadToEndAsync(cancellationToken);

            if (string.IsNullOrWhiteSpace(body))
            {
                return (null, null, JsonBodyError.Empty);
            }

            try
            {
                var document = JsonDocument.Parse(body);
                return (document, body, JsonBodyError.None);
            }
            catch (JsonException)
            {
                return (null, body, JsonBodyError.Invalid);
            }
        }
    }
}
