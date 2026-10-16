namespace Orvano.Modules.Auth.Passwords;

/// <summary>Argon2id cost with one lane (spec 0007 HSH-1): memory in KiB and the number of passes.</summary>
internal sealed record Argon2Cost(int MemoryKiB, int Iterations)
{
    /// <summary>The spec 0006 PWD-1 default: 64 MiB, 3 iterations.</summary>
    public static readonly Argon2Cost Default = new(64 * 1024, 3);

    /// <summary>The OWASP floor from spec 0006 PWD-1: 19 MiB, 2 iterations.</summary>
    public static readonly Argon2Cost Floor = new(19 * 1024, 2);

    public bool IsBelowFloor => MemoryKiB < Floor.MemoryKiB || Iterations < Floor.Iterations;
}
