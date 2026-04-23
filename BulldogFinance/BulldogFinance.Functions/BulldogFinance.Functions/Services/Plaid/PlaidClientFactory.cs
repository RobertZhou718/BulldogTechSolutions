using Going.Plaid;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BulldogFinance.Functions.Services.Plaid
{
    public class PlaidClientFactory : IPlaidClientFactory
    {
        private readonly IOptions<PlaidOptions> _options;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<PlaidClient> _logger;

        public PlaidClientFactory(
            IOptions<PlaidOptions> options,
            IHttpClientFactory httpClientFactory,
            ILogger<PlaidClient> logger)
        {
            _options = options;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public PlaidClient Create(string? accessToken = null)
        {
            var options = _options.Value;
            return new PlaidClient(
                options.Environment,
                options.ClientId,
                options.Secret,
                accessToken ?? string.Empty,
                _httpClientFactory,
                _logger,
                options.ApiVersion);
        }
    }
}
