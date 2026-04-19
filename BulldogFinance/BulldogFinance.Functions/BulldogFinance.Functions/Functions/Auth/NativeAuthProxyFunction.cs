using System.Net;
using BulldogFinance.Functions.Services.Auth;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Functions.Auth
{
    public sealed class NativeAuthProxyFunction
    {
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
            var correlationId = AuthProxyJson.GetCorrelationId(req);

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
                response.Headers.Add(header.Key, string.Join(",", header.Value));
            }

            if (upstreamResponse.Content == null)
            {
                return;
            }

            foreach (var header in upstreamResponse.Content.Headers)
            {
                response.Headers.Add(header.Key, string.Join(",", header.Value));
            }
        }
    }
}
