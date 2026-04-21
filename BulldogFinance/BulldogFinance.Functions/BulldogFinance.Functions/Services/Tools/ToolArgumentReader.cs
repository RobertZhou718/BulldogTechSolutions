using System.Globalization;
using System.Text.Json;
using BulldogFinance.Functions.Models.Tools;

namespace BulldogFinance.Functions.Services.Tools
{
    internal static class ToolArgumentReader
    {
        public static string? GetString(ToolExecutionRequest request, string key)
        {
            if (!request.Arguments.TryGetValue(key, out var value))
            {
                return null;
            }

            try
            {
                return value.ValueKind switch
                {
                    JsonValueKind.String => value.GetString(),
                    JsonValueKind.Number => value.ToString(),
                    JsonValueKind.True => "true",
                    JsonValueKind.False => "false",
                    _ => null
                };
            }
            catch
            {
                return null;
            }
        }

        public static int GetInt(
            ToolExecutionRequest request,
            string key,
            int defaultValue = 0)
        {
            if (!request.Arguments.TryGetValue(key, out var value))
            {
                return defaultValue;
            }

            try
            {
                return value.ValueKind switch
                {
                    JsonValueKind.Number when value.TryGetInt32(out var intValue) => intValue,
                    JsonValueKind.String when int.TryParse(
                        value.GetString(),
                        NumberStyles.Integer,
                        CultureInfo.InvariantCulture,
                        out var parsed) => parsed,
                    _ => defaultValue
                };
            }
            catch
            {
                return defaultValue;
            }
        }

        public static bool TryGetDateTime(
            ToolExecutionRequest request,
            string key,
            out DateTime? value)
        {
            value = null;

            if (!request.Arguments.TryGetValue(key, out var element))
            {
                return true;
            }

            try
            {
                if (element.ValueKind == JsonValueKind.Null)
                {
                    return true;
                }

                if (element.ValueKind == JsonValueKind.String)
                {
                    var raw = element.GetString();
                    if (string.IsNullOrWhiteSpace(raw))
                    {
                        return true;
                    }

                    if (DateTimeOffset.TryParse(
                        raw,
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                        out var dateTimeOffset))
                    {
                        value = dateTimeOffset.UtcDateTime;
                        return true;
                    }

                    return false;
                }

                if (element.ValueKind == JsonValueKind.Number && element.TryGetInt64(out var unixSeconds))
                {
                    value = DateTimeOffset.FromUnixTimeSeconds(unixSeconds).UtcDateTime;
                    return true;
                }

                return false;
            }
            catch
            {
                value = null;
                return false;
            }
        }
    }
}
