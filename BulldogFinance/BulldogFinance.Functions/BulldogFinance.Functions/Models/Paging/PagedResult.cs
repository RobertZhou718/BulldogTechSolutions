namespace BulldogFinance.Functions.Models.Paging
{
    public sealed class PagedResult<T>
    {
        public IReadOnlyList<T> Items { get; init; } = Array.Empty<T>();
        public string? NextCursor { get; init; }
        public bool HasMore { get; init; }
    }
}
