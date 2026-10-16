using Microsoft.EntityFrameworkCore;

namespace Orvano.Host.Database;

/// <summary>
/// Every module's <see cref="DbContext"/>, in the order <c>orvano migrate</c> applies them: a module before any module
/// whose tables depend on it (spec 0002 DAT-10). The jobs schema goes first once it exists (spec 0007 INS-2).
/// </summary>
internal static class MigrationOrder
{
    public static readonly IReadOnlyList<Type> DbContexts = [];

    public static async Task<IReadOnlyList<string>> GetPendingAsync(IServiceProvider services, CancellationToken cancellationToken)
    {
        var pending = new List<string>();
        foreach (var type in DbContexts)
        {
            await using var scope = services.CreateAsyncScope();
            var db = (DbContext)scope.ServiceProvider.GetRequiredService(type);
            pending.AddRange(await db.Database.GetPendingMigrationsAsync(cancellationToken));
        }

        return pending;
    }
}
