using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using BulldogFinance.Functions.Helper;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;

namespace BulldogFinance.Functions.Functions;

public class GetReportLatestFunction
{
    private readonly BlobContainerClient _container;
    private readonly ILogger<GetReportLatestFunction> _logger;

    public GetReportLatestFunction(
        BlobServiceClient blobServiceClient,
        ILogger<GetReportLatestFunction> logger,
        IConfiguration config)
    {
        _logger = logger;
        var containerName = config["Reports:ContainerName"] ?? "reports";
        _container = blobServiceClient.GetBlobContainerClient(containerName);

    }

    [Function("GetReportLatest")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "reports/{period}/latest")]
        HttpRequestData req,
        string period)
    {
        var userId = AuthHelper.GetUserId(req);
        if (string.IsNullOrWhiteSpace(userId))
        {
            var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
            await unauthorized.WriteStringAsync("Unauthorized.");
            return unauthorized;
        }

        period = (period ?? "").Trim().ToLowerInvariant();
        if (period != "weekly" && period != "monthly")
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteStringAsync("Invalid period. Use 'weekly' or 'monthly'.");
            return bad;
        }

        var blobName = $"{period}/{userId}/latest.json";
        _logger.LogInformation("GetReportLatest userId={UserId}, period={Period}, blob={BlobName}", userId, period, blobName);

        var blob = _container.GetBlobClient(blobName);

        if (!await blob.ExistsAsync())
        {
            var notFound = req.CreateResponse(HttpStatusCode.NotFound);
            await notFound.WriteStringAsync($"{period} report not found.");
            return notFound;
        }

        BlobDownloadResult download = await blob.DownloadContentAsync();

        var resp = req.CreateResponse(HttpStatusCode.OK);
        resp.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await resp.WriteStringAsync(download.Content.ToString());
        return resp;
    }
}
