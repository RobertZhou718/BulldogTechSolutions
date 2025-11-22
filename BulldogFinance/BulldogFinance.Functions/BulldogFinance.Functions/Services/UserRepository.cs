using System.Threading;
using System.Threading.Tasks;
using Azure;
using Azure.Data.Tables;
using BulldogFinance.Functions.Models;

namespace BulldogFinance.Functions.Services
{
    public class UserRepository : IUserRepository
    {
        private const string UsersTableName = "Users";

        private readonly TableClient _usersTable;

        public UserRepository(TableServiceClient tableServiceClient)
        {
            _usersTable = tableServiceClient.GetTableClient(UsersTableName);
            _usersTable.CreateIfNotExists();
        }

        public async Task<UserEntity?> GetUserAsync(string userId, CancellationToken cancellationToken = default)
        {
            try
            {
                var response = await _usersTable.GetEntityAsync<UserEntity>(
                    partitionKey: userId,
                    rowKey: "PROFILE",
                    cancellationToken: cancellationToken);

                return response.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                return null;
            }
        }

        public async Task<UserEntity> UpsertUserAsync(UserEntity user, CancellationToken cancellationToken = default)
        {
            await _usersTable.UpsertEntityAsync(user, TableUpdateMode.Replace, cancellationToken);
            return user;
        }
    }
}
