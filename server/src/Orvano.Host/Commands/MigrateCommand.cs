using System.CommandLine;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using Orvano.Host.Configuration;
using Orvano.Host.Database;
using Orvano.Host.Startup;
using Orvano.Host.Telemetry;
using Orvano.SharedKernel.Configuration;

namespace Orvano.Host.Commands;

/// <summary>
/// <c>orvano migrate</c>: applies every schema's migrations in <see cref="MigrationOrder"/> under one advisory lock,
/// then exits (spec 0007 INS-2, spec 0002 DAT-10). It never opens an HTTP port.
/// </summary>
internal static class MigrateCommand
{
    // Any fixed value works; it only has to be the same for every migrate process.
    private const long AdvisoryLockKey = 0x6F7276616E6F; // "orvano"

    public static Command Create()
    {
        var command = new Command("migrate", "Apply database migrations, then exit.")
        {
            TreatUnmatchedTokensAsErrors = false,
        };
        command.SetAction((parseResult, cancellationToken) => RunAsync([.. parseResult.UnmatchedTokens], cancellationToken));
        return command;
    }

    private static async Task<int> RunAsync(string[] configArgs, CancellationToken cancellationToken)
    {
        try
        {
            // Same environment variable as `serve` (spec 0002 CFG-2); the generic host alone reads only DOTNET_ENVIRONMENT.
            var builder = Microsoft.Extensions.Hosting.Host.CreateApplicationBuilder(new HostApplicationBuilderSettings
            {
                Args = configArgs,
                EnvironmentName = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"),
            });
            builder.Configuration.AddOrvanoConfiguration(configArgs);
            builder.AddOrvanoLogging();
            builder.AddPlatformDatabase();

            using var host = builder.Build();
            var logger = host.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Orvano.Host.Migrate");
            var dataSource = host.Services.GetRequiredService<NpgsqlDataSource>();
            await PostgresVersion.EnsureSupportedAsync(dataSource, cancellationToken);

            await using var lockConnection = await dataSource.OpenConnectionAsync(cancellationToken);
            await ExecuteAsync(lockConnection, "SELECT pg_advisory_lock(@key)", cancellationToken);
            try
            {
                foreach (var type in MigrationOrder.DbContexts)
                {
                    logger.MigrationsApplying(type.Name);
                    await using var scope = host.Services.CreateAsyncScope();
                    var db = (DbContext)scope.ServiceProvider.GetRequiredService(type);
                    await db.Database.MigrateAsync(cancellationToken);
                }
            }
            finally
            {
                await ExecuteAsync(lockConnection, "SELECT pg_advisory_unlock(@key)", CancellationToken.None);
            }

            logger.MigrationsComplete(MigrationOrder.DbContexts.Count);
            return 0;
        }
        catch (ConfigurationException ex)
        {
            await Console.Error.WriteLineAsync(ex.Message);
        }
        catch (OptionsValidationException ex)
        {
            await Console.Error.WriteLineAsync(OptionsErrors.Describe(ex));
        }
        catch (StartupFailedException ex)
        {
            await Console.Error.WriteLineAsync(ex.Message);
        }

        return 1;
    }

    private static async Task ExecuteAsync(NpgsqlConnection connection, string sql, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("key", AdvisoryLockKey);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
