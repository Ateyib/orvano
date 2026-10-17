using Microsoft.Extensions.Configuration;

using Orvano.Infrastructure.RootKeys;
using Orvano.SharedKernel.Configuration;

using Shouldly;

using Xunit;

namespace Orvano.Infrastructure.Tests;

// Spec 0006 SCR-2: 32 random bytes; the server refuses to start without a valid key.
public sealed class RootKeyTests
{
    [Fact]
    public void Generate_returns_32_bytes_of_base64_when_called()
    {
        string key = RootKey.Generate();

        Convert.FromBase64String(key).Length.ShouldBe(32);
    }

    [Fact]
    public void Generate_returns_a_different_key_when_called_twice() =>
        RootKey.Generate().ShouldNotBe(RootKey.Generate());

    [Fact]
    public void EnsureConfigured_accepts_the_key_when_it_has_a_trailing_newline_from_the_file()
    {
        IConfiguration configuration = With(RootKey.Generate() + "\n");

        Should.NotThrow(() => RootKey.EnsureConfigured(configuration));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void EnsureConfigured_fails_naming_both_variables_when_no_key_is_set(string? value)
    {
        ConfigurationException error = Should.Throw<ConfigurationException>(() => RootKey.EnsureConfigured(With(value)));

        error.Message.ShouldContain("ORVANO_ROOT_KEY_FILE");
        error.Message.ShouldContain("ORVANO_ROOT_KEY");
    }

    [Theory]
    [InlineData("not base64 at all!")]
    [InlineData("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==")] // 31 bytes
    [InlineData("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==")] // 33 bytes
    public void EnsureConfigured_fails_when_the_key_is_not_32_bytes_of_base64(string value)
    {
        ConfigurationException error = Should.Throw<ConfigurationException>(() => RootKey.EnsureConfigured(With(value)));

        error.Message.ShouldContain("32 bytes");
    }

    [Fact]
    public void EnsureConfigured_never_echoes_the_key_when_it_is_rejected()
    {
        const string wrong = "c2hvcnQta2V5LXRoYXQtaXMtc2VjcmV0";

        ConfigurationException error = Should.Throw<ConfigurationException>(() => RootKey.EnsureConfigured(With(wrong)));

        error.Message.ShouldNotContain(wrong);
    }

    private static IConfiguration With(string? value) =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { [RootKey.ConfigurationKey] = value }).Build();
}
