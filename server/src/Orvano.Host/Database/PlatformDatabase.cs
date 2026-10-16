using Microsoft.Extensions.Options;
using Npgsql;

namespace Orvano.Host.Database;

internal static class PlatformDatabase
{
    /// <summary>One <see cref="NpgsqlDataSource"/> for the platform database, used by every module (spec 0002 CFG-5).</summary>
    public static IHostApplicationBuilder AddPlatformDatabase(this IHostApplicationBuilder builder)
    {
        builder.Services.AddOptions<DatabaseOptions>().BindConfiguration(DatabaseOptions.Section).ValidateOnStart();
        builder.Services.AddSingleton<IValidateOptions<DatabaseOptions>, DatabaseOptionsValidator>();

        var development = builder.Environment.IsDevelopment();
        builder.Services.AddSingleton(services =>
        {
            var options = services.GetRequiredService<IOptions<DatabaseOptions>>().Value;
            var connection = new NpgsqlConnectionStringBuilder
            {
                Host = options.Host,
                Port = options.Port,
                Database = options.Name,
                Username = options.Username,
                Password = options.Password,
                SslMode = options.SslMode,
                GssEncryptionMode = GssEncryptionMode.Disable, // no Kerberos; the chiseled image has no libgssapi
                MaxPoolSize = options.PoolSize,
                ApplicationName = "orvano",
                IncludeErrorDetail = development, // spec 0002 DAT-12
            };

            var dataSource = new NpgsqlDataSourceBuilder(connection.ConnectionString);
            dataSource.UseLoggerFactory(services.GetRequiredService<ILoggerFactory>());
            return dataSource.Build();
        });

        return builder;
    }
}
