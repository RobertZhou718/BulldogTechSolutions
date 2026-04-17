using BulldogFinance.Functions.Models.Chat;
using Azure;
using Azure.Data.Tables;

namespace BulldogFinance.Functions.Services.Chat
{
    public sealed class ConversationService : IConversationService
    {
        private const string ConversationsTableName = "ChatConversations";
        private const string MessagesTableName = "ChatMessages";

        private readonly TableClient _conversationsTable;
        private readonly TableClient _messagesTable;

        public ConversationService(TableServiceClient tableServiceClient)
        {
            _conversationsTable = tableServiceClient.GetTableClient(ConversationsTableName);
            _messagesTable = tableServiceClient.GetTableClient(MessagesTableName);
            _conversationsTable.CreateIfNotExists();
            _messagesTable.CreateIfNotExists();
        }

        public async Task<ChatContextDto> CreateOrLoadContextAsync(
            string userId,
            ChatRequest request,
            CancellationToken ct = default)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(userId);
            ArgumentNullException.ThrowIfNull(request);

            var conversationId = string.IsNullOrWhiteSpace(request.ConversationId)
                ? Guid.NewGuid().ToString("N")
                : request.ConversationId!;

            var conversation = await GetConversationEntityAsync(userId, conversationId, ct);
            if (conversation is null)
            {
                var now = DateTime.UtcNow;
                conversation = new ChatConversationEntity
                {
                    PartitionKey = userId,
                    RowKey = conversationId,
                    Title = BuildTitle(request.Message),
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                };

                await _conversationsTable.AddEntityAsync(conversation, ct);
            }
            else if (string.IsNullOrWhiteSpace(conversation.Title))
            {
                conversation.Title = BuildTitle(request.Message);
                conversation.UpdatedAtUtc = DateTime.UtcNow;
                await _conversationsTable.UpsertEntityAsync(conversation, TableUpdateMode.Replace, ct);
            }

            var messages = await LoadMessagesAsync(userId, conversationId, ct);

            var context = new ChatContextDto
            {
                UserId = userId,
                ConversationId = conversationId,
                LatestUserMessage = request.Message,
                Messages = messages
            };

            return context;
        }

        public async Task<IReadOnlyList<ChatConversationSummaryDto>> ListConversationsAsync(
            string userId,
            CancellationToken ct = default)
        {
            var result = new List<ChatConversationSummaryDto>();

            var query = _conversationsTable.QueryAsync<ChatConversationEntity>(
                entity => entity.PartitionKey == userId,
                cancellationToken: ct);

            await foreach (var item in query)
            {
                result.Add(new ChatConversationSummaryDto
                {
                    ConversationId = item.RowKey,
                    Title = item.Title,
                    CreatedAtUtc = item.CreatedAtUtc,
                    UpdatedAtUtc = item.UpdatedAtUtc
                });
            }

            result.Sort((a, b) => b.UpdatedAtUtc.CompareTo(a.UpdatedAtUtc));
            return result;
        }

        public async Task<ChatConversationDetailDto?> GetConversationAsync(
            string userId,
            string conversationId,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(conversationId))
            {
                return null;
            }

            var conversation = await GetConversationEntityAsync(userId, conversationId, ct);
            if (conversation is null)
            {
                return null;
            }

            return new ChatConversationDetailDto
            {
                ConversationId = conversation.RowKey,
                Title = conversation.Title,
                CreatedAtUtc = conversation.CreatedAtUtc,
                UpdatedAtUtc = conversation.UpdatedAtUtc,
                Messages = await LoadMessagesAsync(userId, conversationId, ct)
            };
        }

        public async Task AppendUserMessageAsync(
            ChatContextDto context,
            string message,
            CancellationToken ct = default)
        {
            var dto = new ChatMessageDto
            {
                Role = "user",
                Content = message,
                CreatedUtc = DateTimeOffset.UtcNow
            };

            context.Messages.Add(dto);

            context.LatestUserMessage = message;

            await AddMessageAsync(context, dto, ct);
            await TouchConversationAsync(context.UserId, context.ConversationId, message, ct);
        }

        public async Task AppendAssistantMessageAsync(
            ChatContextDto context,
            string message,
            CancellationToken ct = default)
        {
            var dto = new ChatMessageDto
            {
                Role = "assistant",
                Content = message,
                CreatedUtc = DateTimeOffset.UtcNow
            };

            context.Messages.Add(dto);

            await AddMessageAsync(context, dto, ct);
            await TouchConversationAsync(context.UserId, context.ConversationId, context.LatestUserMessage, ct);
        }

        public Task AppendAgentStepAsync(
            ChatContextDto context,
            ChatAgentStepDto step,
            CancellationToken ct = default)
        {
            context.Steps.Add(step);
            return Task.CompletedTask;
        }

        private async Task<ChatConversationEntity?> GetConversationEntityAsync(
            string userId,
            string conversationId,
            CancellationToken ct)
        {
            try
            {
                var response = await _conversationsTable.GetEntityAsync<ChatConversationEntity>(
                    userId,
                    conversationId,
                    cancellationToken: ct);

                return response.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                return null;
            }
        }

        private async Task<List<ChatMessageDto>> LoadMessagesAsync(
            string userId,
            string conversationId,
            CancellationToken ct)
        {
            var result = new List<ChatMessageDto>();
            var partitionKey = BuildMessagePartitionKey(userId, conversationId);

            var query = _messagesTable.QueryAsync<ChatMessageEntity>(
                entity => entity.PartitionKey == partitionKey,
                cancellationToken: ct);

            await foreach (var item in query)
            {
                result.Add(new ChatMessageDto
                {
                    Role = item.Role,
                    Content = item.Content,
                    CreatedUtc = item.CreatedUtc
                });
            }

            result.Sort((a, b) => a.CreatedUtc.CompareTo(b.CreatedUtc));
            return result;
        }

        private async Task AddMessageAsync(
            ChatContextDto context,
            ChatMessageDto message,
            CancellationToken ct)
        {
            var createdUtc = message.CreatedUtc == default ? DateTimeOffset.UtcNow : message.CreatedUtc;
            var entity = new ChatMessageEntity
            {
                PartitionKey = BuildMessagePartitionKey(context.UserId, context.ConversationId),
                RowKey = $"{createdUtc.UtcTicks:D19}_{Guid.NewGuid():N}",
                ConversationId = context.ConversationId,
                Role = message.Role,
                Content = message.Content,
                CreatedUtc = createdUtc.UtcDateTime
            };

            await _messagesTable.AddEntityAsync(entity, ct);
        }

        private async Task TouchConversationAsync(
            string userId,
            string conversationId,
            string titleSource,
            CancellationToken ct)
        {
            var conversation = await GetConversationEntityAsync(userId, conversationId, ct);
            if (conversation is null)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(conversation.Title))
            {
                conversation.Title = BuildTitle(titleSource);
            }

            conversation.UpdatedAtUtc = DateTime.UtcNow;
            await _conversationsTable.UpsertEntityAsync(conversation, TableUpdateMode.Replace, ct);
        }

        private static string BuildMessagePartitionKey(string userId, string conversationId)
        {
            return $"{userId}:{conversationId}";
        }

        private static string BuildTitle(string? text)
        {
            var value = (text ?? string.Empty).Trim();
            if (value.Length == 0)
            {
                return "New chat";
            }

            value = value.Replace("\r", " ").Replace("\n", " ");
            if (value.Length <= 60)
            {
                return value;
            }

            return $"{value[..57].TrimEnd()}...";
        }
    }
}
