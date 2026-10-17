using System.Collections;

using Microsoft.Extensions.Configuration;

using Orvano.SharedKernel.Configuration;

using Shouldly;

using Xunit;

namespace Orvano.SharedKernel.Tests.Configuration;

// Spec 0002 CFG-2 (ORVANO_ variables, __ for nesting) and CFG-3 (the _FILE form of any key).
public sealed class OrvanoEnvironmentConfigurationTests : IDisposable
{
    private readonly DirectoryInfo _secrets = Directory.CreateTempSubdirectory("orvano-secrets-");

    public void Dispose() => _secrets.Delete(recursive: true);

    [Fact]
    public void Variable_maps_to_nested_key_when_it_uses_double_underscores()
    {
        IConfigurationRoot configuration = Build(new() { ["ORVANO_DATABASE__HOST"] = "db.internal" });

        configuration["Database:Host"].ShouldBe("db.internal");
    }

    [Fact]
    public void Variable_is_read_whatever_its_case_when_prefix_is_lowercase()
    {
        IConfigurationRoot configuration = Build(new() { ["orvano_auth__sessionlifetime"] = "7.00:00:00" });

        configuration["Auth:SessionLifetime"].ShouldBe("7.00:00:00");
    }

    [Fact]
    public void Variable_is_ignored_when_it_lacks_the_ORVANO_prefix()
    {
        IConfigurationRoot configuration = Build(new() { ["DATABASE__HOST"] = "elsewhere", ["PATH"] = "/usr/bin" });

        configuration["Database:Host"].ShouldBeNull();
        configuration["PATH"].ShouldBeNull();
    }

    [Fact]
    public void File_form_supplies_the_value_when_KEY_FILE_points_to_a_file()
    {
        string path = Secret("db_password", "s3cret");

        IConfigurationRoot configuration = Build(new() { ["ORVANO_DATABASE__PASSWORD_FILE"] = path });

        configuration["Database:Password"].ShouldBe("s3cret");
    }

    [Fact]
    public void File_form_sets_the_root_key_when_ORVANO_ROOT_KEY_FILE_is_set()
    {
        string path = Secret("root.key", "a2V5\n");

        IConfigurationRoot configuration = Build(new() { ["ORVANO_ROOT_KEY_FILE"] = path });

        configuration["ROOT_KEY"].ShouldBe("a2V5");
    }

    [Theory]
    [InlineData("value\n", "value")]
    [InlineData("value\r\n", "value")]
    [InlineData("value\n\n", "value\n")]
    [InlineData("value", "value")]
    [InlineData("  spaced  \n", "  spaced  ")]
    public void File_value_loses_exactly_one_trailing_newline_when_read(string contents, string expected)
    {
        string path = Secret("value", contents);

        IConfigurationRoot configuration = Build(new() { ["ORVANO_SOME__KEY_FILE"] = path });

        configuration["Some:Key"].ShouldBe(expected);
    }

    [Fact]
    public void Loading_fails_naming_both_variables_when_KEY_and_KEY_FILE_are_both_set()
    {
        string path = Secret("db_password", "from-file");
        var variables = new Dictionary<string, string> { ["ORVANO_DATABASE__PASSWORD"] = "plain", ["ORVANO_DATABASE__PASSWORD_FILE"] = path };

        ConfigurationException error = Should.Throw<ConfigurationException>(() => Build(variables));

        error.Message.ShouldContain("ORVANO_DATABASE__PASSWORD");
        error.Message.ShouldContain("ORVANO_DATABASE__PASSWORD_FILE");
    }

    [Fact]
    public void Loading_fails_naming_the_variable_when_the_file_does_not_exist()
    {
        string missing = Path.Combine(_secrets.FullName, "nope");

        ConfigurationException error = Should.Throw<ConfigurationException>(() => Build(new() { ["ORVANO_DATABASE__PASSWORD_FILE"] = missing }));

        error.Message.ShouldContain("ORVANO_DATABASE__PASSWORD_FILE");
        error.Message.ShouldContain(missing);
    }

    [Fact]
    public void Loading_never_puts_the_secret_in_the_error_when_both_forms_are_set()
    {
        string path = Secret("db_password", "from-file");

        ConfigurationException error = Should.Throw<ConfigurationException>(() =>
            Build(new() { ["ORVANO_DATABASE__PASSWORD"] = "plain-secret", ["ORVANO_DATABASE__PASSWORD_FILE"] = path }));

        error.Message.ShouldNotContain("plain-secret");
        error.Message.ShouldNotContain("from-file");
    }

    [Fact]
    public void Config_file_variable_is_not_read_as_a_key_when_ORVANO_CONFIG_FILE_is_set()
    {
        IConfigurationRoot configuration = Build(new() { ["ORVANO_CONFIG_FILE"] = Path.Combine(_secrets.FullName, "missing.json") });

        configuration["CONFIG"].ShouldBeNull();
    }

    private static IConfigurationRoot Build(Dictionary<string, string> variables) =>
        new ConfigurationBuilder()
            .Add(new OrvanoEnvironmentConfigurationSource { Variables = new Hashtable(variables) })
            .Build();

    private string Secret(string name, string contents)
    {
        string path = Path.Combine(_secrets.FullName, name);
        File.WriteAllText(path, contents);
        return path;
    }
}
