using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Functions
{
    public class MeFunction
    {
        private readonly IUserRepository _userRepository;

        public MeFunction(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        [Function("GetMe")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "me")]
            HttpRequestData req,
            FunctionContext context)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteStringAsync("Unauthorized.");
                return unauthorized;
            }

            var userEntity = await _userRepository.GetUserAsync(userId);

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");

            var result = new
            {
                userId,
                displayName = userEntity?.DisplayName,
                email = userEntity?.Email,
                defaultCurrency = userEntity?.DefaultCurrency ?? "CAD",
                onboardingDone = userEntity?.OnboardingDone ?? false
            };

            await response.WriteStringAsync(JsonSerializer.Serialize(result));
            return response;
        }
    }
}
