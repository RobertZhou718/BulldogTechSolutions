using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.McpServer.Functions;

public class ChatFunction
{
    private readonly ILogger<ChatFunction> _logger;

    public ChatFunction(ILogger<ChatFunction> logger)
    {
        _logger = logger;
    }

    [Function("ChatFunction")]
    public IActionResult Run([HttpTrigger(AuthorizationLevel.Function, "get", "post")] HttpRequest req)
    {
        _logger.LogInformation("C# HTTP trigger function processed a request.");
        return new OkObjectResult("Welcome to Azure Functions!");
    }
}