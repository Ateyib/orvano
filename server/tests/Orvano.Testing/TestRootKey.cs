using System.Security.Cryptography;

namespace Orvano.Testing;

/// <summary>Throwaway root keys (spec 0006 SCR-5: tests use generated values).</summary>
public static class TestRootKey
{
    public static string Create() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
}
