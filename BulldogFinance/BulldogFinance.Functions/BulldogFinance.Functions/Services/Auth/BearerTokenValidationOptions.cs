using Microsoft.Extensions.Configuration;

namespace BulldogFinance.Functions.Services.Auth
{
    public sealed class BearerTokenValidationOptions
    {
        public string? TenantId { get; init; }

        public string? TenantSubdomain { get; init; }

        public string? MetadataAddress { get; init; }

        public IReadOnlyList<string> ValidAudiences { get; init; } = Array.Empty<string>();

        public bool IsConfigured =>
            !string.IsNullOrWhiteSpace(MetadataAddress)
            && ValidAudiences.Count > 0;

        public static BearerTokenValidationOptions FromConfiguration(IConfiguration configuration)
        {
            var tenantId = FirstNonEmpty(
                configuration["Auth:TenantId"],
                configuration["AuthProxy:TenantId"]);

            var tenantSubdomain = FirstNonEmpty(
                configuration["Auth:TenantSubdomain"],
                configuration["Auth:TenantName"],
                configuration["AuthProxy:TenantSubdomain"]);

            var metadataAddress = FirstNonEmpty(configuration["Auth:MetadataAddress"]);
            if (string.IsNullOrWhiteSpace(metadataAddress)
                && !string.IsNullOrWhiteSpace(tenantId)
                && !string.IsNullOrWhiteSpace(tenantSubdomain))
            {
                metadataAddress = $"https://{tenantSubdomain}.ciamlogin.com/{tenantId}/v2.0/.well-known/openid-configuration";
            }

            var explicitAudience = FirstNonEmpty(
                configuration["Auth:Audience"],
                configuration["AuthProxy:Audience"]);

            var apiClientId = FirstNonEmpty(
                configuration["Auth:ApiClientId"],
                configuration["Auth:ClientId"],
                configuration["AuthProxy:ClientId"]);

            var audiences = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            AddDelimitedValues(audiences, explicitAudience);

            if (!string.IsNullOrWhiteSpace(apiClientId))
            {
                audiences.Add(apiClientId);
                audiences.Add($"api://{apiClientId}");
                audiences.Add($"api://{apiClientId}/api.access");
            }

            return new BearerTokenValidationOptions
            {
                TenantId = tenantId,
                TenantSubdomain = tenantSubdomain,
                MetadataAddress = metadataAddress?.Trim(),
                ValidAudiences = audiences.ToArray()
            };
        }

        private static void AddDelimitedValues(ISet<string> values, string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return;
            }

            foreach (var value in raw.Split(new[] { ',', ';', ' ' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                values.Add(value);
            }
        }

        private static string? FirstNonEmpty(params string?[] values)
        {
            foreach (var value in values)
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value.Trim();
                }
            }

            return null;
        }
    }
}
