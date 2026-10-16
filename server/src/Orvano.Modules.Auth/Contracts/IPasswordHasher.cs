namespace Orvano.Modules.Auth.Contracts;

/// <summary>
/// Hashes and verifies passwords (spec 0006 PWD-1, PWD-6). One implementation, Argon2id (spec 0007 HSH-1),
/// shared by end user and console sign in.
/// </summary>
public interface IPasswordHasher
{
    /// <summary>Hashes a password into a PHC string with a fresh random salt.</summary>
    string Hash(string password);

    /// <summary>True when the password matches the PHC string. A malformed string never matches.</summary>
    bool Verify(string password, string hash);
}
