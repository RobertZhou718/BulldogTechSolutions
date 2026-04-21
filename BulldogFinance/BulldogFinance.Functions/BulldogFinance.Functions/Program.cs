using Azure.Data.Tables;
using Azure.Identity;
using Azure.Storage.Blobs;
using BulldogFinance.Functions.Middleware;
using BulldogFinance.Functions.Services.Accounts;
using BulldogFinance.Functions.Services.Auth;
using BulldogFinance.Functions.Services.Chat;
using BulldogFinance.Functions.Services.Investments;
using BulldogFinance.Functions.Services.Plaid;
using BulldogFinance.Functions.Services.Reports;
using BulldogFinance.Functions.Services.Tools;
using BulldogFinance.Functions.Services.Transactions;
using BulldogFinance.Functions.Services.Users;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication(builder =>
    {
        builder.UseMiddleware<BearerTokenAuthenticationMiddleware>();
    })
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
        services.AddSingleton<BlobServiceClient>(sp =>
        {
            var config = sp.GetRequiredService<IConfiguration>();

            var connectionString = config["BlobStorage:ConnectionString"];
            var serviceUri = config["BlobStorage:ServiceUri"];
            var managedIdentityClientId = config["ManagedIdentity:ClientId"];

            if (!string.IsNullOrWhiteSpace(connectionString))
            {
                return new BlobServiceClient(connectionString);
            }

            if (string.IsNullOrWhiteSpace(serviceUri))
            {
                throw new InvalidOperationException(
                    "Either BlobStorage:ConnectionString or BlobStorage:ServiceUri must be configured.");
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

            return new BlobServiceClient(uri, credential);
        });

        services.AddHttpClient("Finnhub", (sp, client) =>
        {
            var config = sp.GetRequiredService<IConfiguration>();
            var baseUrl = config["Finnhub:BaseUrl"] ?? "https://finnhub.io/api/v1/";
            client.BaseAddress = new Uri(baseUrl);
        });

        services.AddHttpClient("Plaid", (sp, client) =>
        {
            var config = sp.GetRequiredService<IConfiguration>();
            var baseUrl = config["Plaid:BaseUrl"] ?? "https://production.plaid.com";
            client.BaseAddress = new Uri(baseUrl);
        });

        services.AddHttpClient("AuthProxy", (sp, client) =>
        {
            var config = sp.GetRequiredService<IConfiguration>();
            var baseUrl = config["AuthProxy:BaseUrl"];
            var timeoutSeconds = int.TryParse(config["AuthProxy:TimeoutSeconds"], out var parsedTimeout)
                && parsedTimeout > 0
                ? parsedTimeout
                : 30;

            if (!string.IsNullOrWhiteSpace(baseUrl))
            {
                client.BaseAddress = new Uri(baseUrl);
            }

            client.Timeout = TimeSpan.FromSeconds(timeoutSeconds);
        });

        var dataProtectionBuilder = services
            .AddDataProtection()
            .SetApplicationName("BulldogFinance.Functions");

        var dataProtectionKeysDirectory = configuration["DataProtection:KeysDirectory"];
        if (!string.IsNullOrWhiteSpace(dataProtectionKeysDirectory))
        {
            dataProtectionBuilder.PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysDirectory));
        }

        services.AddSingleton<IUserRepository, UserRepository>();
        services.AddSingleton<IAccountRepository, AccountRepository>();
        services.AddSingleton<ITransactionRepository, TransactionRepository>();
        services.AddSingleton<IPlaidRepository, PlaidRepository>();

        services.AddSingleton<IExternalAuthProxyService, ExternalAuthProxyService>();
        services.AddSingleton<IAuthTokenValidator, AuthTokenValidator>();
        services.AddSingleton<INativeAuthApiProxyService, NativeAuthApiProxyService>();
        services.AddSingleton<IInvestmentService, InvestmentService>();
        services.AddSingleton<IInvestmentOverviewService, InvestmentOverviewService>();
        services.AddSingleton<IPlaidTokenProtector, PlaidTokenProtector>();
        services.AddSingleton<IPlaidClient, PlaidClient>();
        services.AddSingleton<IPlaidSyncService, PlaidSyncService>();

        services.AddSingleton<IAiClient, AzureOpenAiClient>();
        services.AddSingleton(sp => (AzureOpenAiClient)sp.GetRequiredService<IAiClient>());

        services.AddSingleton<IConversationService, ConversationService>();
        services.AddSingleton<ISystemPromptBuilder, SystemPromptBuilder>();
        services.AddSingleton<IToolExecutor, ToolExecutor>();
        services.AddSingleton<IChatAgentService, ChatAgentService>();

        services.AddSingleton<IAgentTool, GetUserProfileTool>();
        services.AddSingleton<IAgentTool, GetAccountsTool>();
        services.AddSingleton<IAgentTool, GetTransactionsTool>();
        services.AddSingleton<IAgentTool, GetInvestmentsTool>();
        services.AddSingleton<IAgentTool, GetInvestmentOverviewTool>();
        services.AddSingleton<IAgentTool, GetWatchlistTool>();
        services.AddSingleton<IAgentTool, SearchFinanceNewsTool>();
        services.AddSingleton<IAgentTool, GeneratePortfolioReportTool>();

        services.AddSingleton<IReportStorage, BlobReportStorage>();
        services.AddSingleton<IReportService, ReportService>();

    })
    .Build();

host.Run();
