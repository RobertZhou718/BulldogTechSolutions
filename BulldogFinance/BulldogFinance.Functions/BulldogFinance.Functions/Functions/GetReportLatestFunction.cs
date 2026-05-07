using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Reports;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

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
        string period,
        CancellationToken cancellationToken)
    {
        var userId = AuthHelper.GetUserId(req);
        if (string.IsNullOrWhiteSpace(userId))
            return await ApiResponse.UnauthorizedAsync(req, cancellationToken);

        period = (period ?? "").Trim().ToLowerInvariant();
        if (period != "weekly" && period != "monthly")
            return await ApiResponse.BadRequestAsync(req, "Invalid period. Use 'weekly' or 'monthly'.", cancellationToken);

        var blobName = $"{period}/{userId}/latest.json";
        _logger.LogInformation("GetReportLatest userId={UserId}, period={Period}, blob={BlobName}", userId, period, blobName);

        try
        {
            var blob = _container.GetBlobClient(blobName);
            BlobDownloadResult download = await blob.DownloadContentAsync(cancellationToken: cancellationToken);
            var content = download.Content.ToString();
            var report = JsonSerializer.Deserialize<GeneratedReport>(content, JsonDefaults.Api);

            if (report is null)
            {
                throw new JsonException("Report blob content was empty or invalid.");
            }

            return await ApiResponse.OkAsync(req, new
            {
                hasReport = true,
                report,
                message = string.Empty
            }, cancellationToken);
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            _logger.LogInformation(
                "No latest {Period} report found for user {UserId}. Blob={BlobName}",
                period,
                userId,
                blobName);

            return await ApiResponse.OkAsync(req, new
            {
                hasReport = false,
                report = (GeneratedReport?)null,
                message = $"No {period} report is available yet. Add more transaction data and try again later."
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load latest {Period} report for user {UserId}.", period, userId);

            return await ApiResponse.JsonAsync(req, HttpStatusCode.InternalServerError, new
            {
                hasReport = false,
                report = (GeneratedReport?)null,
                message = $"We couldn't load your latest {period} report right now. Please try again later."
            }, cancellationToken);
        }
    }
}
