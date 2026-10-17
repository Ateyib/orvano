using Orvano.Testing;

namespace Orvano.Host.IntegrationTests.Cli;

// Spec 0007 RUN-1: one executable with subcommands; --help and --version work with no configuration.
public sealed class CliCommandTests
{
    [Fact, Trait("Spec", "0007:RUN-1")]
    public async Task Version_prints_the_version_when_no_configuration_is_set()
    {
        OrvanoCli.Result result = await OrvanoCli.RunAsync(["--version"], null, TestContext.Current.CancellationToken);

        result.ExitCode.ShouldBe(0);
        result.Output.Trim().ShouldMatch(@"^\d+\.\d+\.\d+");
    }

    [Fact, Trait("Spec", "0007:RUN-1")]
    public async Task Help_lists_every_command_when_no_configuration_is_set()
    {
        OrvanoCli.Result result = await OrvanoCli.RunAsync(["--help"], null, TestContext.Current.CancellationToken);

        result.ExitCode.ShouldBe(0);
        foreach (string? command in new[] { "serve", "migrate", "init", "healthcheck", "admin" })
        {
            result.Output.ShouldContain(command);
        }
    }

    [Fact, Trait("Spec", "0007:HSH-3")]
    public async Task Admin_selftest_passes_when_libsodium_loads()
    {
        OrvanoCli.Result result = await OrvanoCli.RunAsync(["admin", "selftest"], null, TestContext.Current.CancellationToken);

        result.ExitCode.ShouldBe(0);
        result.Output.ShouldContain("Self test passed");
    }

    [Fact, Trait("Spec", "0007:IMG-4")]
    public async Task Healthcheck_exits_1_when_nothing_listens_on_the_port()
    {
        int port = Ports.Free();

        OrvanoCli.Result result = await OrvanoCli.RunAsync(["healthcheck", "--port", port.ToString(System.Globalization.CultureInfo.InvariantCulture)],
            null, TestContext.Current.CancellationToken);

        result.ExitCode.ShouldBe(1);
    }
}
