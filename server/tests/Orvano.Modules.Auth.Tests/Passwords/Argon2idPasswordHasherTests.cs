using System.Text.RegularExpressions;

using Orvano.Modules.Auth.Passwords;

using Shouldly;

using Xunit;

namespace Orvano.Modules.Auth.Tests.Passwords;

// Spec 0006 PWD-1, PWD-4 and spec 0007 HSH-1. Most tests hash at the PWD-1 floor to stay fast; the PHC string
// carries its own cost, so verifying never depends on the hasher's configured cost.
public sealed partial class Argon2idPasswordHasherTests
{
    private const string Password = "correct horse battery staple";

    private readonly Argon2idPasswordHasher _hasher = new(Argon2Cost.Floor);

    [Fact]
    public void Hash_writes_a_PHC_string_at_the_PWD1_default_when_using_the_default_cost()
    {
        string hash = new Argon2idPasswordHasher().Hash(Password);

        hash.ShouldStartWith("$argon2id$v=19$m=65536,t=3,p=1$");
    }

    [Fact]
    public void Hash_uses_a_16_byte_salt_and_unpadded_base64_when_written()
    {
        string hash = _hasher.Hash(Password);

        Match match = PhcPattern().Match(hash);
        match.Success.ShouldBeTrue(hash); // the salt and hash parts allow no '=' padding
        Convert.FromBase64String(Pad(match.Groups["salt"].Value)).Length.ShouldBe(16);
    }

    [Fact]
    public void Hash_differs_for_the_same_password_when_called_twice() =>
        _hasher.Hash(Password).ShouldNotBe(_hasher.Hash(Password));

    [Fact]
    public void Verify_returns_true_when_the_password_matches() =>
        _hasher.Verify(Password, _hasher.Hash(Password)).ShouldBeTrue();

    [Theory]
    [InlineData("correct horse battery stapl")]
    [InlineData("Correct horse battery staple")]
    [InlineData("")]
    public void Verify_returns_false_when_the_password_differs(string attempt) =>
        _hasher.Verify(attempt, _hasher.Hash(Password)).ShouldBeFalse();

    [Fact]
    public void Verify_reads_the_cost_from_the_hash_when_the_hasher_is_configured_differently()
    {
        string stored = _hasher.Hash(Password);

        new Argon2idPasswordHasher(Argon2Cost.Default).Verify(Password, stored).ShouldBeTrue();
    }

    [Fact]
    public void Verify_returns_true_when_the_password_is_unicode()
    {
        const string unicode = "pässwörd 密码 🔐";

        _hasher.Verify(unicode, _hasher.Hash(unicode)).ShouldBeTrue();
    }

    [Fact]
    public void Verify_returns_false_when_the_stored_hash_was_tampered_with()
    {
        string stored = _hasher.Hash(Password);
        // Not the last character: in unpadded base64 its low bits are unused, so changing it can decode to the same
        // bytes. Every bit of the second to last character counts.
        char target = stored[^2];
        string tampered = stored[..^2] + (target == 'A' ? 'B' : 'A') + stored[^1];

        _hasher.Verify(Password, tampered).ShouldBeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("not a hash")]
    [InlineData("$argon2i$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNoaGFzaGhhc2g")]
    [InlineData("$argon2id$v=16$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNoaGFzaGhhc2g")]
    [InlineData("$argon2id$v=19$m=19456,t=2,p=2$c2FsdHNhbHRzYWx0c2FsdA$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNoaGFzaGhhc2g")]
    [InlineData("$argon2id$v=19$m=19456,t=0,p=1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNoaGFzaGhhc2g")]
    [InlineData("$argon2id$v=19$m=-1,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNoaGFzaGhhc2g")]
    [InlineData("$argon2id$v=19$t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNoaGFzaGhhc2g")]
    [InlineData("$argon2id$v=19$m=19456,t=2,p=1,x=9$c2FsdHNhbHRzYWx0c2FsdA$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNoaGFzaGhhc2g")]
    [InlineData("$argon2id$v=19$m=19456,t=2,p=1$c2hvcnQ$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNoaGFzaGhhc2g")]
    [InlineData("$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$!!!notbase64!!!")]
    [InlineData("$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA")]
    public void Verify_returns_false_without_throwing_when_the_hash_is_malformed(string malformed) =>
        _hasher.Verify(Password, malformed).ShouldBeFalse();

    [Fact]
    public void Hash_accepts_the_password_when_it_is_exactly_1024_bytes_of_UTF8()
    {
        string password = new string('a', 1024);

        _hasher.Verify(password, _hasher.Hash(password)).ShouldBeTrue();
    }

    [Fact]
    public void Hash_throws_when_the_password_is_over_1024_bytes_of_UTF8()
    {
        string password = new string('é', 513); // 2 bytes each: 1026 bytes

        Should.Throw<ArgumentException>(() => _hasher.Hash(password));
    }

    [Fact]
    public void Verify_returns_false_when_the_password_is_over_1024_bytes_of_UTF8()
    {
        string stored = _hasher.Hash(Password);

        _hasher.Verify(new string('a', 1025), stored).ShouldBeFalse();
    }

    [Fact]
    public void Hash_refuses_when_the_cost_is_below_the_PWD1_floor()
    {
        var weak = new Argon2idPasswordHasher(new Argon2Cost(8 * 1024, 1));

        Should.Throw<InvalidOperationException>(() => weak.Hash(Password));
    }

    [Fact]
    public void Hash_never_contains_the_password_when_written()
    {
        string hash = _hasher.Hash(Password);

        hash.ShouldNotContain(Password);
        hash.ShouldNotContain(Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(Password)).TrimEnd('='));
    }

    private static string Pad(string unpadded) => unpadded.PadRight(unpadded.Length + ((4 - (unpadded.Length % 4)) % 4), '=');

    [GeneratedRegex(@"^\$argon2id\$v=19\$m=\d+,t=\d+,p=1\$(?<salt>[A-Za-z0-9+/]+)\$(?<hash>[A-Za-z0-9+/]+)$")]
    private static partial Regex PhcPattern();
}
