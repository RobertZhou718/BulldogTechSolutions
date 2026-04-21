using BulldogFinance.Functions.Models.Users;

namespace BulldogFinance.Functions.Services.Users
{
    public interface IUserRepository
    {
        Task<UserEntity?> GetUserAsync(string userId, CancellationToken cancellationToken = default);
        Task<UserEntity> UpsertUserAsync(UserEntity user, CancellationToken cancellationToken = default);
    }
}
