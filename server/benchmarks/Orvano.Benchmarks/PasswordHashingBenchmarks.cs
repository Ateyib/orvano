using BenchmarkDotNet.Attributes;

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using Orvano.Modules.Auth;
using Orvano.Modules.Auth.Contracts;

namespace Orvano.Benchmarks;

/// <summary>
/// Spec 0007 HSH-2: one Argon2id hash at the spec 0006 PWD-1 default (64 MiB, 3 iterations) must stay at or under
/// 250 ms on the reference box (4 vCPU, 8 GB).
/// </summary>
[MemoryDiagnoser]
public class PasswordHashingBenchmarks
{
    private const string Password = "correct horse battery staple";

    private ServiceProvider? _services;
    private IPasswordHasher? _hasher;
    private string _hash = string.Empty;

    [GlobalSetup]
    public void Setup()
    {
        _services = new ServiceCollection().AddAuthModule(new ConfigurationBuilder().Build()).BuildServiceProvider();
        _hasher = _services.GetRequiredService<IPasswordHasher>();
        _hash = _hasher.Hash(Password);
    }

    [GlobalCleanup]
    public void Cleanup() => _services?.Dispose();

    [Benchmark]
    public string Hash() => _hasher!.Hash(Password);

    [Benchmark]
    public bool Verify() => _hasher!.Verify(Password, _hash);
}
