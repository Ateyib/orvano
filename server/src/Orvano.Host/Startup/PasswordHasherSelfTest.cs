using Orvano.Modules.Auth.Contracts;

namespace Orvano.Host.Startup;

/// <summary>
/// Spec 0007 HSH-3: hash and verify a fixed value, so a libsodium that fails to load stops the server
/// with a clear message instead of failing the first sign in.
/// </summary>
internal static class PasswordHasherSelfTest
{
    private const string Sample = "orvano self test";

    public static string? Run(IPasswordHasher hasher)
    {
        try
        {
            var hash = hasher.Hash(Sample);
            if (!hasher.Verify(Sample, hash) || hasher.Verify(Sample + "!", hash))
            {
                return "Argon2id produced a hash that does not verify.";
            }

            return null;
        }
        catch (Exception ex) when (ex is DllNotFoundException or TypeInitializationException
                                       or EntryPointNotFoundException or BadImageFormatException)
        {
            return $"The libsodium native library could not be loaded ({ex.GetType().Name}: {ex.Message}).";
        }
    }
}
