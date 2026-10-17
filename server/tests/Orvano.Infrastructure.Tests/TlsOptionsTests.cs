using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Orvano.Infrastructure.Tls;

using Shouldly;

using Xunit;

namespace Orvano.Infrastructure.Tests;

// Spec 0007 TLS-2: both PEM files, or neither.
public sealed class TlsOptionsTests
{
    [Fact]
    public void Tls_is_off_when_neither_file_is_set() =>
        Resolve(new()).IsEnabled.ShouldBeFalse();

    [Fact]
    public void Tls_is_on_when_both_files_are_set() =>
        Resolve(new() { ["Tls:CertFile"] = "/tls/cert.pem", ["Tls:KeyFile"] = "/tls/key.pem" }).IsEnabled.ShouldBeTrue();

    [Theory]
    [InlineData("Tls:CertFile")]
    [InlineData("Tls:KeyFile")]
    public void Validation_fails_naming_both_variables_when_only_one_file_is_set(string key)
    {
        OptionsValidationException error = Should.Throw<OptionsValidationException>(() => Resolve(new() { [key] = "/tls/file.pem" }));

        error.Message.ShouldContain("ORVANO_TLS__CERTFILE");
        error.Message.ShouldContain("ORVANO_TLS__KEYFILE");
    }

    private static TlsOptions Resolve(Dictionary<string, string?> settings)
    {
        IConfigurationRoot configuration = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
        using ServiceProvider services = new ServiceCollection()
            .AddSingleton<IConfiguration>(configuration)
            .AddInfrastructure()
            .BuildServiceProvider();
        return services.GetRequiredService<IOptions<TlsOptions>>().Value;
    }
}
