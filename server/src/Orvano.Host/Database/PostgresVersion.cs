using System.Globalization;
using Npgsql;
using Orvano.Host.Startup;

namespace Orvano.Host.Database;

/// <summary>Spec 0007 RUN-5 and PG-1: PostgreSQL 18 is the only supported major.</summary>
internal static class PostgresVersion
{
    public const int MinimumVersionNumber = 180000;

    public static async Task EnsureSupportedAsync(NpgsqlDataSource dataSource, CancellationToken cancellationToken)
    {
        int version;
        try
        {
            await using var command = dataSource.CreateCommand("SELECT current_setting('server_version_num')::int");
            version = await command.ExecuteScalarAsync(cancellationToken) is int number ? number : 0;
        }
        catch (NpgsqlException ex)
        {
            throw new StartupFailedException($"Cannot reach the platform database: {ex.Message}", ex);
        }

        if (version < MinimumVersionNumber)
        {
            throw new StartupFailedException(string.Create(CultureInfo.InvariantCulture,
                $"The platform database runs PostgreSQL {version / 10000}; Orvano needs PostgreSQL 18 or later."));
        }
    }
}
