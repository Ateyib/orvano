using System.Diagnostics;

using Orvano.Testing;

namespace Orvano.Host.IntegrationTests.Cli;

// Spec 0007 INS-3 and spec 0006 SCR-2: init writes root.key and .env once, owner only, and never overwrites.
public sealed class InitCommandTests : IDisposable
{
    private readonly DirectoryInfo _install = Directory.CreateTempSubdirectory("orvano-install-");

    public void Dispose() => _install.Delete(recursive: true);

    private string KeyPath => Path.Combine(_install.FullName, "root.key");

    private string EnvPath => Path.Combine(_install.FullName, ".env");

    [Fact, Trait("Spec", "0007:INS-3")]
    public async Task Init_writes_a_32_byte_root_key_when_the_folder_is_empty()
    {
        OrvanoCli.Result result = await InitAsync("--domain", "orvano.example.com");

        result.ExitCode.ShouldBe(0);
        Convert.FromBase64String((await File.ReadAllTextAsync(KeyPath, TestContext.Current.CancellationToken)).Trim()).Length.ShouldBe(32);
    }

    [Fact, Trait("Spec", "0007:INS-3")]
    public async Task Init_writes_every_compose_variable_with_generated_passwords_when_the_folder_is_empty()
    {
        await InitAsync("--domain", "orvano.example.com");

        Dictionary<string, string> env = await ReadEnvAsync();
        env["ORVANO_DOMAIN"].ShouldBe("orvano.example.com");
        env["ORVANO_PUBLIC_URL"].ShouldBe("https://orvano.example.com");
        foreach (string? name in new[] { "POSTGRES_PASSWORD", "ORVANO_DB_PASSWORD", "ORVANO_PROVISIONER_PASSWORD" })
        {
            env[name].Length.ShouldBeGreaterThanOrEqualTo(40);
        }

        env.Values.Distinct().Count().ShouldBe(env.Count);
    }

    [Fact, Trait("Spec", "0007:INS-3")]
    public async Task Init_uses_the_given_public_url_when_one_is_passed()
    {
        await InitAsync("--domain", "orvano.example.com", "--public-url", "https://api.example.com/");

        (await ReadEnvAsync())["ORVANO_PUBLIC_URL"].ShouldBe("https://api.example.com");
    }

    [Fact, Trait("Spec", "0007:INS-5")]
    public async Task Init_writes_the_key_readable_and_env_owner_only_inside_a_0700_folder()
    {
        Assert.SkipWhen(OperatingSystem.IsWindows(), "Unix file modes");
        if (OperatingSystem.IsWindows())
        {
            return;
        }

        await InitAsync("--domain", "orvano.example.com");

        File.GetUnixFileMode(_install.FullName).ShouldBe(UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        File.GetUnixFileMode(KeyPath).ShouldBe(UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.GroupRead | UnixFileMode.OtherRead);
        File.GetUnixFileMode(EnvPath).ShouldBe(UnixFileMode.UserRead | UnixFileMode.UserWrite);
    }

    [Fact, Trait("Spec", "0007:INS-5")]
    public async Task Init_tightens_an_existing_open_folder_to_0700_and_keeps_its_other_files()
    {
        Assert.SkipWhen(OperatingSystem.IsWindows(), "Unix file modes");
        if (OperatingSystem.IsWindows())
        {
            return;
        }

        File.SetUnixFileMode(_install.FullName, (UnixFileMode)0b111_101_101);
        string keep = Path.Combine(_install.FullName, "compose.yaml");
        await File.WriteAllTextAsync(keep, "name: orvano\n", TestContext.Current.CancellationToken);

        OrvanoCli.Result result = await InitAsync("--domain", "orvano.example.com");

        result.ExitCode.ShouldBe(0, result.Error);
        result.Output.ShouldContain("0700");
        File.GetUnixFileMode(_install.FullName).ShouldBe((UnixFileMode)0b111_000_000);
        (await File.ReadAllTextAsync(keep, TestContext.Current.CancellationToken)).ShouldBe("name: orvano\n");
    }

    [Fact, Trait("Spec", "0007:INS-5")]
    public async Task Init_creates_the_folder_at_0700_when_it_does_not_exist()
    {
        Assert.SkipWhen(OperatingSystem.IsWindows(), "Unix file modes");
        if (OperatingSystem.IsWindows())
        {
            return;
        }

        string fresh = Path.Combine(_install.FullName, "new-install");

        OrvanoCli.Result result = await OrvanoCli.RunAsync(["init", "--out", fresh, "--domain", "orvano.example.com"], null,
            TestContext.Current.CancellationToken);

        result.ExitCode.ShouldBe(0, result.Error);
        File.GetUnixFileMode(fresh).ShouldBe((UnixFileMode)0b111_000_000);
    }

    [Fact, Trait("Spec", "0007:INS-5")]
    public async Task Init_still_makes_the_key_0644_when_the_umask_is_strict()
    {
        Assert.SkipWhen(OperatingSystem.IsWindows(), "Unix umask");
        if (OperatingSystem.IsWindows())
        {
            return;
        }

        ProcessStartInfo start = OrvanoCli.StartInfo(["init", "--out", _install.FullName, "--domain", "orvano.example.com"]);
        var shell = new System.Diagnostics.ProcessStartInfo("/bin/sh") { RedirectStandardOutput = true, RedirectStandardError = true };
        shell.ArgumentList.Add("-c");
        shell.ArgumentList.Add("umask 077; exec \"$@\"");
        shell.ArgumentList.Add("sh");
        shell.ArgumentList.Add(start.FileName);
        foreach (string arg in start.ArgumentList)
        {
            shell.ArgumentList.Add(arg);
        }

        using Process process = System.Diagnostics.Process.Start(shell)!;
        await process.WaitForExitAsync(TestContext.Current.CancellationToken);

        process.ExitCode.ShouldBe(0);
        File.GetUnixFileMode(KeyPath).ShouldBe((UnixFileMode)0b110_100_100);
    }

    [Fact, Trait("Spec", "0007:INS-5")]
    public async Task Init_leaves_the_folder_mode_alone_when_it_refuses_to_overwrite()
    {
        Assert.SkipWhen(OperatingSystem.IsWindows(), "Unix file modes");
        if (OperatingSystem.IsWindows())
        {
            return;
        }

        File.SetUnixFileMode(_install.FullName, (UnixFileMode)0b111_101_101);
        await File.WriteAllTextAsync(KeyPath, "existing\n", TestContext.Current.CancellationToken);

        OrvanoCli.Result result = await InitAsync("--domain", "orvano.example.com");

        result.ExitCode.ShouldBe(1);
        File.GetUnixFileMode(_install.FullName).ShouldBe((UnixFileMode)0b111_101_101);
    }

    [Fact, Trait("Spec", "0006:SCR-2")]
    public async Task Init_prints_the_backup_warning_without_the_key_when_it_succeeds()
    {
        OrvanoCli.Result result = await InitAsync("--domain", "orvano.example.com");

        result.Output.ShouldContain("BACK UP root.key");
        result.Output.ShouldContain("safe only inside this folder");
        result.Output.ShouldNotContain((await File.ReadAllTextAsync(KeyPath, TestContext.Current.CancellationToken)).Trim());
    }

    [Fact, Trait("Spec", "0007:INS-3")]
    public async Task Init_refuses_and_keeps_the_existing_key_when_root_key_already_exists()
    {
        await InitAsync("--domain", "orvano.example.com");
        string before = await File.ReadAllTextAsync(KeyPath, TestContext.Current.CancellationToken);

        OrvanoCli.Result result = await InitAsync("--domain", "other.example.com");

        result.ExitCode.ShouldBe(1);
        result.Error.ShouldContain("already exists");
        (await File.ReadAllTextAsync(KeyPath, TestContext.Current.CancellationToken)).ShouldBe(before);
    }

    [Fact, Trait("Spec", "0007:INS-3")]
    public async Task Init_refuses_and_writes_no_key_when_only_env_already_exists()
    {
        await File.WriteAllTextAsync(EnvPath, "MINE=1\n", TestContext.Current.CancellationToken);

        OrvanoCli.Result result = await InitAsync("--domain", "orvano.example.com");

        result.ExitCode.ShouldBe(1);
        File.Exists(KeyPath).ShouldBeFalse();
        (await File.ReadAllTextAsync(EnvPath, TestContext.Current.CancellationToken)).ShouldBe("MINE=1\n");
    }

    [Theory, Trait("Spec", "0007:INS-3")]
    [InlineData("--domain", "not a domain")]
    [InlineData("--domain", "bad\nORVANO_ROOT_KEY=injected")]
    public async Task Init_refuses_and_writes_nothing_when_the_domain_is_invalid(string option, string value)
    {
        OrvanoCli.Result result = await InitAsync(option, value);

        result.ExitCode.ShouldBe(1);
        File.Exists(KeyPath).ShouldBeFalse();
        File.Exists(EnvPath).ShouldBeFalse();
    }

    [Theory, Trait("Spec", "0007:INS-3")]
    [InlineData("ftp://orvano.example.com")]
    [InlineData("not a url")]
    [InlineData("/relative/path")]
    public async Task Init_refuses_when_the_public_url_is_not_http_or_https(string publicUrl)
    {
        OrvanoCli.Result result = await InitAsync("--domain", "orvano.example.com", "--public-url", publicUrl);

        result.ExitCode.ShouldBe(1);
        result.Error.ShouldContain("--public-url must be an absolute http or https URL");
        result.Error.ShouldNotContain("Unhandled exception");
        File.Exists(KeyPath).ShouldBeFalse();
    }

    [Fact, Trait("Spec", "0007:INS-3")]
    public async Task Init_fails_with_usage_when_the_domain_is_missing()
    {
        OrvanoCli.Result result = await OrvanoCli.RunAsync(["init", "--out", _install.FullName], null, TestContext.Current.CancellationToken);

        result.ExitCode.ShouldNotBe(0);
        File.Exists(KeyPath).ShouldBeFalse();
    }

    private Task<OrvanoCli.Result> InitAsync(params string[] args) =>
        OrvanoCli.RunAsync(["init", "--out", _install.FullName, .. args], null, TestContext.Current.CancellationToken);

    private async Task<Dictionary<string, string>> ReadEnvAsync() =>
        (await File.ReadAllLinesAsync(EnvPath, TestContext.Current.CancellationToken))
            .Where(line => line.Length > 0 && !line.StartsWith('#'))
            .Select(line => line.Split('=', 2))
            .ToDictionary(parts => parts[0], parts => parts[1]);
}
