using Azure.Data.Tables;
using Azure.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using BulldogFinance.Functions.Services;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureAppConfiguration((context, config) =>
    {
        config
            .AddJsonFile("local.settings.json", optional: true, reloadOnChange: true)
            .AddEnvironmentVariables();
    })
    .ConfigureServices((context, services) =>
    {
        IConfiguration configuration = context.Configuration;

        services.AddSingleton<TableServiceClient>(sp =>
        {
            var config = sp.GetRequiredService<IConfiguration>();

            var connectionString = config["TableStorage:ConnectionString"];
            var serviceUri = config["TableStorage:ServiceUri"];
            var managedIdentityClientId = config["ManagedIdentity:ClientId"];

            if (!string.IsNullOrWhiteSpace(connectionString))
            {
                return new TableServiceClient(connectionString);
            }

            if (string.IsNullOrWhiteSpace(serviceUri))
            {
                throw new InvalidOperationException(
                    "Either TableStorage:ConnectionString or TableStorage:ServiceUri must be configured.");
            }

            var uri = new Uri(serviceUri);

            DefaultAzureCredential credential;

            if (!string.IsNullOrWhiteSpace(managedIdentityClientId))
            {
                credential = new DefaultAzureCredential(
                    new DefaultAzureCredentialOptions
                    {
                        ManagedIdentityClientId = managedIdentityClientId
                    });
            }
            else
            {
                credential = new DefaultAzureCredential();
            }

            return new TableServiceClient(uri, credential);
        });
        services.AddHttpClient("Finnhub", (sp, client) =>
        {
            var config = sp.GetRequiredService<IConfiguration>();
            var baseUrl = config["Finnhub:BaseUrl"] ?? "https://finnhub.io/api/v1/";
            client.BaseAddress = new Uri(baseUrl);
        });
        services.AddSingleton<IUserRepository, UserRepository>();
        services.AddSingleton<IAccountRepository, AccountRepository>();
        services.AddSingleton<ITransactionRepository, TransactionRepository>();
        services.AddSingleton<IInvestmentService, InvestmentService>();
        services.AddSingleton<IInvestmentOverviewService, InvestmentOverviewService>();

    })
    .Build();

host.Run();
