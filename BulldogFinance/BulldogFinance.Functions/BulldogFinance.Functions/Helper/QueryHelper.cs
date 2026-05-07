using System.Globalization;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Helper
{
    /// <summary>
    /// Parsed query-string view that gives Functions a strongly typed accessor
    /// instead of hand-rolling the same `Split('&').Split('=')` loop in every endpoint.
    /// </summary>
    public sealed class QueryParams
    {
        private static readonly QueryParams Empty = new(new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase));

        private readonly Dictionary<string, string> _map;

        private QueryParams(Dictionary<string, string> map)
        {
            _map = map;
        }

        public static QueryParams Parse(string? query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return Empty;
            }

            var trimmed = query.TrimStart('?');
            if (string.IsNullOrWhiteSpace(trimmed))
            {
                return Empty;
            }

            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var pair in trimmed.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var parts = pair.Split('=', 2);
                if (parts.Length != 2 || string.IsNullOrWhiteSpace(parts[0]))
                {
                    continue;
                }

                // Last value wins on duplicate keys; matches typical web-server behavior.
                map[parts[0]] = Uri.UnescapeDataString(parts[1]);
            }

            return new QueryParams(map);
        }

        public bool TryGet(string key, out string value)
        {
            if (_map.TryGetValue(key, out var raw) && !string.IsNullOrWhiteSpace(raw))
            {
                value = raw;
                return true;
            }

            value = string.Empty;
            return false;
        }

        public string? GetString(string key) =>
            TryGet(key, out var value) ? value : null;

        public int GetInt(string key, int defaultValue, int min = int.MinValue, int max = int.MaxValue)
        {
            if (TryGet(key, out var raw) &&
                int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
            {
                return Math.Clamp(parsed, min, max);
            }

            return defaultValue;
        }

        public bool GetBool(string key, bool defaultValue)
        {
            if (TryGet(key, out var raw) && bool.TryParse(raw, out var parsed))
            {
                return parsed;
            }

            return defaultValue;
        }

        public DateTime? GetUtcDateTime(string key)
        {
            if (!TryGet(key, out var raw))
            {
                return null;
            }

            if (DateTime.TryParse(
                    raw,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                    out var parsed))
            {
                return DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
            }

            return null;
        }
    }

    public static class QueryHelper
    {
        public static QueryParams Parse(HttpRequestData req) => QueryParams.Parse(req.Url.Query);
    }
}
