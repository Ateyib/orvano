using Microsoft.Extensions.Options;

using Orvano.SharedKernel.Configuration;

using Shouldly;

using Xunit;

namespace Orvano.SharedKernel.Tests.Configuration;

// Spec 0002 CFG-4: bad configuration names the environment variable to fix.
public sealed class ConfigurationNamesTests
{
    [Theory]
    [InlineData("Auth:SessionLifetime", "ORVANO_AUTH__SESSIONLIFETIME")]
    [InlineData("Database:Host", "ORVANO_DATABASE__HOST")]
    [InlineData("ROOT_KEY", "ORVANO_ROOT_KEY")]
    [InlineData("Storage:S3:Bucket", "ORVANO_STORAGE__S3__BUCKET")]
    public void Key_becomes_its_environment_variable_when_converted(string key, string expected) =>
        ConfigurationNames.ToEnvironmentVariable(key).ShouldBe(expected);

    [Fact]
    public void Failure_names_the_variable_when_the_source_generated_validator_reports_a_member()
    {
        OptionsValidationException exception = Failure("Username: The DatabaseOptions.Username field is required.");

        IReadOnlyList<string> lines = ConfigurationNames.Describe(exception, "Database");

        lines.ShouldBe(["ORVANO_DATABASE__USERNAME: The DatabaseOptions.Username field is required"]);
    }

    [Fact]
    public void Failure_names_every_variable_when_a_rule_spans_several_members()
    {
        OptionsValidationException exception = Failure("CertFile, KeyFile: Set both, or neither.");

        IReadOnlyList<string> lines = ConfigurationNames.Describe(exception, "Tls");

        lines.Single().ShouldStartWith("ORVANO_TLS__CERTFILE, ORVANO_TLS__KEYFILE: Set both, or neither");
    }

    [Fact]
    public void Failure_names_the_variable_when_data_annotations_validation_reports_members()
    {
        OptionsValidationException exception = Failure("DataAnnotation validation failed for 'TlsOptions' members: 'CertFile,KeyFile' with the error: 'Set both.'.");

        IReadOnlyList<string> lines = ConfigurationNames.Describe(exception, "Tls");

        lines.Single().ShouldStartWith("ORVANO_TLS__CERTFILE, ORVANO_TLS__KEYFILE: Set both");
    }

    [Fact]
    public void Failure_is_kept_as_written_when_it_names_no_member()
    {
        OptionsValidationException exception = Failure("Something is wrong with the whole section");

        ConfigurationNames.Describe(exception, "Database").ShouldBe(["Something is wrong with the whole section"]);
    }

    private static OptionsValidationException Failure(string message) =>
        new(Options.DefaultName, typeof(object), [message]);
}
