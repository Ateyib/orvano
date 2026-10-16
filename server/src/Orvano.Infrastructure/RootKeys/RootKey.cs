using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;
using Orvano.SharedKernel.Configuration;

namespace Orvano.Infrastructure.RootKeys;

/// <summary>
/// The install's root key (spec 0006 SCR-2): 32 random bytes, written as base64 text so the same value works in
/// <c>ORVANO_ROOT_KEY</c> and in the file named by <c>ORVANO_ROOT_KEY_FILE</c>. The server never generates it;
/// <c>orvano init</c> does.
/// </summary>
public static class RootKey
{
    /// <summary>The configuration key; <c>ORVANO_ROOT_KEY</c> or <c>ORVANO_ROOT_KEY_FILE</c> sets it.</summary>
    public const string ConfigurationKey = "ROOT_KEY";

    public const int SizeInBytes = 32;

    /// <summary>Creates a new key as the text written to <c>root.key</c>.</summary>
    public static string Generate() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(SizeInBytes));

    /// <summary>
    /// Checks that a root key is configured and well formed, so the server refuses to start without one.
    /// The key check value against the platform database comes with the first stored secret (SCR-1).
    /// </summary>
    public static void EnsureConfigured(IConfiguration configuration)
    {
        var text = configuration[ConfigurationKey];
        if (string.IsNullOrWhiteSpace(text))
        {
            throw new ConfigurationException(
                "No root key. Set ORVANO_ROOT_KEY_FILE to the root.key file that `orvano init` wrote (or ORVANO_ROOT_KEY to its contents).");
        }

        var bytes = new byte[SizeInBytes + 1];
        if (!Convert.TryFromBase64String(text.Trim(), bytes, out var written) || written != SizeInBytes)
        {
            throw new ConfigurationException(
                "The root key in ORVANO_ROOT_KEY or ORVANO_ROOT_KEY_FILE is not 32 bytes of base64. Use the file `orvano init` wrote.");
        }

        CryptographicOperations.ZeroMemory(bytes);
    }
}
