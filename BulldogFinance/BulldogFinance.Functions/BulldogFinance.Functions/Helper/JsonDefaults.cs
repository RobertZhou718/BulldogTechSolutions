using System.Text.Json;

namespace BulldogFinance.Functions.Helper
{
    /// <summary>
    /// Single source of truth for JSON serialization options used by HTTP functions.
    /// camelCase output keeps the frontend contract consistent across endpoints.
    /// </summary>
    public static class JsonDefaults
    {
        public static readonly JsonSerializerOptions Api = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }
}
