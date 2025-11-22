using System.Threading;
using System.Threading.Tasks;
using BulldogFinance.Functions.Models;

namespace BulldogFinance.Functions.Services
{
    public interface IUserRepository
    {
        Task<UserEntity?> GetUserAsync(string userId, CancellationToken cancellationToken = default);
        Task<UserEntity> UpsertUserAsync(UserEntity user, CancellationToken cancellationToken = default);
    }
}
