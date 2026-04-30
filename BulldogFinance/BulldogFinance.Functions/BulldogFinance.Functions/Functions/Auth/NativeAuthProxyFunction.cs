using System.Net;
using BulldogFinance.Functions.Services.Auth;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Functions.Auth
{
    public sealed class NativeAuthProxyFunction
    {
        private static readonly HashSet<string> BlockedResponseHeaders = new(StringComparer.OrdinalIgnoreCase)
        {
            "Content-Length",
            "Transfer-Encoding",
            "Connection",
            "Keep-Alive",
            "Server",
            "Date",
            "Set-Cookie"
        };

        private readonly INativeAuthApiProxyService _nativeAuthApiProxyService;
        private readonly ILogger<NativeAuthProxyFunction> _logger;

        public NativeAuthProxyFunction(
            INativeAuthApiProxyService nativeAuthApiProxyService,
            ILogger<NativeAuthProxyFunction> logger)
        {
            _nativeAuthApiProxyService = nativeAuthApiProxyService;
            _logger = logger;
        }

        [Function("NativeAuthProxy")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "native-auth/{*path}")] HttpRequestData req,
            string path,
            CancellationToken cancellationToken)
        {
            var correlationId = GetCorrelationId(req);

            try
            {
                using var reader = new StreamReader(req.Body);
                var body = await reader.ReadToEndAsync(cancellationToken);

                using var upstreamResponse = await _nativeAuthApiProxyService.ForwardAsync(
                    path,
                    body,
                    correlationId,
                    cancellationToken);

                var response = req.CreateResponse(upstreamResponse.StatusCode);
                CopyHeaders(upstreamResponse, response);

                var responseBody = upstreamResponse.Content == null
                    ? string.Empty
                    : await upstreamResponse.Content.ReadAsStringAsync(cancellationToken);

                if (!string.IsNullOrEmpty(responseBody))
                {
                    await response.WriteStringAsync(responseBody, cancellationToken);
                }

                return response;
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Native auth proxy rejected request. CorrelationId={CorrelationId}", correlationId);
                var response = req.CreateResponse(HttpStatusCode.BadRequest);
                await response.WriteStringAsync(ex.Message, cancellationToken);
                return response;
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Native auth proxy upstream request failed. CorrelationId={CorrelationId}", correlationId);
                var response = req.CreateResponse(HttpStatusCode.BadGateway);
                await response.WriteStringAsync("The native auth upstream service is unavailable.", cancellationToken);
                return response;
            }
        }

        private static void CopyHeaders(HttpResponseMessage upstreamResponse, HttpResponseData response)
        {
            foreach (var header in upstreamResponse.Headers)
            {
                TryCopyHeader(response, header.Key, header.Value);
            }

            if (upstreamResponse.Content == null)
            {
                return;
            }

            foreach (var header in upstreamResponse.Content.Headers)
            {
                TryCopyHeader(response, header.Key, header.Value);
            }
        }

        private static void TryCopyHeader(HttpResponseData response, string headerName, IEnumerable<string> values)
        {
            if (BlockedResponseHeaders.Contains(headerName))
            {
                return;
            }

            response.Headers.TryAddWithoutValidation(headerName, values);
        }

        private static string GetCorrelationId(HttpRequestData req)
        {
            string[] candidates = { "x-correlation-id", "x-ms-correlation-id", "x-ms-client-request-id" };

            foreach (var name in candidates)
            {
                if (req.Headers.TryGetValues(name, out var values))
                {
                    var value = values.FirstOrDefault(static v => !string.IsNullOrWhiteSpace(v));
                    if (!string.IsNullOrWhiteSpace(value))
                    {
                        return value.Trim();
                    }
                }
            }

            return Guid.NewGuid().ToString("N");
        }
    }
}
