using Microsoft.Extensions.Diagnostics.HealthChecks;

using Npgsql;

namespace Orvano.Host.Database;

/// <summary>Ready means the platform database answers and no migrations are pending (spec 0002 LOG-6).</summary>
internal sealed class PlatformDatabaseHealthCheck(NpgsqlDataSource dataSource, IServiceProvider services) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken)
    {
        try
        {
            await using NpgsqlCommand command = dataSource.CreateCommand("SELECT 1");
            await command.ExecuteScalarAsync(cancellationToken);
        }
        catch (NpgsqlException ex)
        {
            return HealthCheckResult.Unhealthy("The platform database does not answer.", ex);
        }

        IReadOnlyList<string> pending = await MigrationOrder.GetPendingAsync(services, cancellationToken);
        return pending.Count == 0
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy("Migrations are pending.");
    }
}
