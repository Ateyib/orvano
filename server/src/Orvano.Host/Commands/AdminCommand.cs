using System.CommandLine;
using Microsoft.Extensions.Configuration;
using Orvano.Host.Startup;
using Orvano.Modules.Auth;
using Orvano.Modules.Auth.Contracts;

namespace Orvano.Host.Commands;

/// <summary>
/// <c>orvano admin &lt;command&gt;</c>: operator commands that need host access (spec 0007 RUN-1).
/// Spec 0006's <c>reset-operator</c> and <c>reset-secrets</c> arrive with the features that own them.
/// </summary>
internal static class AdminCommand
{
    public static Command Create()
    {
        var selfTest = new Command("selftest", "Check that the password hasher's native library loads (spec 0007 HSH-3).");
        selfTest.SetAction(_ => SelfTest());

        return new Command("admin", "Operator commands.") { selfTest };
    }

    private static int SelfTest()
    {
        var services = new ServiceCollection()
            .AddAuthModule(new ConfigurationBuilder().Build())
            .BuildServiceProvider();
        using (services)
        {
            if (PasswordHasherSelfTest.Run(services.GetRequiredService<IPasswordHasher>()) is { } failure)
            {
                Console.Error.WriteLine($"Self test failed: {failure}");
                return 1;
            }
        }

        Console.WriteLine($"Self test passed: Argon2id hashes and verifies on {System.Runtime.InteropServices.RuntimeInformation.RuntimeIdentifier}.");
        return 0;
    }
}
