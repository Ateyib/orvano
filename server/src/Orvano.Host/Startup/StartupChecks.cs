using Npgsql;
using Orvano.Host.Database;
using Orvano.Modules.Auth.Contracts;

namespace Orvano.Host.Startup;

/// <summary>
/// Runs before the server accepts requests: PostgreSQL 18 or later (spec 0007 RUN-5), no pending migrations
/// (spec 0002 DAT-10), and a working password hasher (spec 0007 HSH-3).
/// </summary>
internal sealed class StartupChecks(
    NpgsqlDataSource dataSource, IServiceProvider services, IPasswordHasher hasher) : IHostedLifecycleService
{
    public async Task StartingAsync(CancellationToken cancellationToken)
    {
        if (PasswordHasherSelfTest.Run(hasher) is { } failure)
        {
            throw new StartupFailedException(failure);
        }

        await PostgresVersion.EnsureSupportedAsync(dataSource, cancellationToken);

        var pending = await MigrationOrder.GetPendingAsync(services, cancellationToken);
        if (pending.Count > 0)
        {
            throw new StartupFailedException(
                $"{pending.Count} migrations are pending. Run `orvano migrate` before starting the server.");
        }
    }

    public Task StartAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StartedAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StoppingAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StoppedAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
