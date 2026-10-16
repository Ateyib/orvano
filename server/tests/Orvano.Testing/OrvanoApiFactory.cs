using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Orvano.Testing;

/// <summary>
/// Hosts the real server in memory (spec 0002 TST-6). Settings go through <c>UseSetting</c>, which reaches the
/// server's configuration before it builds, the same way command line arguments do.
/// </summary>
public class OrvanoApiFactory(IReadOnlyDictionary<string, string> settings, string? contentRoot = null)
    : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        if (contentRoot is not null)
        {
            builder.UseContentRoot(contentRoot);
        }

        foreach (var (key, value) in settings)
        {
            builder.UseSetting(key, value);
        }
    }

    /// <summary>Settings for a server on the fixture's database with a fresh root key.</summary>
    public static Dictionary<string, string> DefaultSettings(PostgresFixture postgres) =>
        new(postgres.DatabaseSettings) { ["ROOT_KEY"] = TestRootKey.Create() };
}
