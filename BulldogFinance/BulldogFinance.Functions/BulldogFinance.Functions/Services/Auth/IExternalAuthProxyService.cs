using System.Threading;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Services.Auth
{
    public interface IExternalAuthProxyService
    {
        Task<AuthProxyServiceResult> SignInAsync(
            NativeSignInRequest request,
            string correlationId,
            CancellationToken cancellationToken = default);

        Task<AuthProxyServiceResult> SignUpAsync(
            NativeSignUpRequest request,
            string correlationId,
            CancellationToken cancellationToken = default);

        Task<AuthProxyServiceResult> CompleteSignUpChallengeAsync(
            NativeChallengeRequest request,
            string correlationId,
            CancellationToken cancellationToken = default);

        Task<AuthProxyServiceResult> StartPasswordResetAsync(
            NativePasswordResetStartRequest request,
            string correlationId,
            CancellationToken cancellationToken = default);

        Task<AuthProxyServiceResult> VerifyPasswordResetAsync(
            NativePasswordResetVerifyRequest request,
            string correlationId,
            CancellationToken cancellationToken = default);

        Task<AuthProxyServiceResult> StartGoogleSocialAuthAsync(
            NativeSocialAuthStartRequest request,
            string correlationId,
            CancellationToken cancellationToken = default);

        Task<AuthProxyServiceResult> RefreshTokenAsync(
            NativeTokenRefreshRequest request,
            string correlationId,
            CancellationToken cancellationToken = default);

        Task<AuthProxyServiceResult> SignOutAsync(
            NativeSignOutRequest request,
            string correlationId,
            CancellationToken cancellationToken = default);
    }
}
