using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Models.Tools
{
    public sealed class ToolExecutionResult
    {
        public string ToolName { get; init; } = string.Empty;

        public bool IsSuccess { get; init; }

        public string Summary { get; init; } = string.Empty;

        public object? Data { get; init; }

        public string? ErrorCode { get; init; }

        public string? ErrorMessage { get; init; }

        public static ToolExecutionResult Success(
            string toolName,
            string summary,
            object? data = null)
        {
            return new ToolExecutionResult
            {
                ToolName = toolName,
                IsSuccess = true,
                Summary = summary,
                Data = data
            };
        }

        public static ToolExecutionResult Failure(
            string toolName,
            string errorCode,
            string errorMessage)
        {
            return new ToolExecutionResult
            {
                ToolName = toolName,
                IsSuccess = false,
                Summary = errorMessage,
                ErrorCode = errorCode,
                ErrorMessage = errorMessage
            };
        }
    }
}
