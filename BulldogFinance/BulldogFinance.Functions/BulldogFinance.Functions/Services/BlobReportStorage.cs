using System.Text;
using System.Text.Json;
using Azure.Storage.Blobs;
using BulldogFinance.Functions.Models;
using Microsoft.Extensions.Configuration;

namespace BulldogFinance.Functions.Services;

public sealed class BlobReportStorage : IReportStorage
{
    private readonly BlobContainerClient _container;
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public BlobReportStorage(BlobServiceClient blobServiceClient, IConfiguration config)
    {
        var containerName = config["Reports:ContainerName"] ?? "reports";
        _container = blobServiceClient.GetBlobContainerClient(containerName);
    }

    public async Task SaveLatestAsync(GeneratedReport report, CancellationToken ct = default)
    {
        await _container.CreateIfNotExistsAsync(cancellationToken: ct);

        var path = $"{report.Period.ToString().ToLowerInvariant()}/{report.UserId}/latest.json";
        var blob = _container.GetBlobClient(path);

        var payload = JsonSerializer.Serialize(report, JsonOpts);
        var bytes = Encoding.UTF8.GetBytes(payload);

        using var ms = new MemoryStream(bytes);
        await blob.UploadAsync(ms, overwrite: true, cancellationToken: ct);
    }
}
