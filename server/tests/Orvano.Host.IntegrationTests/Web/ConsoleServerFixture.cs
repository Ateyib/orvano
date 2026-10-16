using Orvano.Testing;

namespace Orvano.Host.IntegrationTests.Web;

/// <summary>One in memory server with a stand in console build, shared by a test class.</summary>
public sealed class ConsoleServerFixture : IDisposable
{
    public ConsoleServerFixture(PostgresFixture postgres)
    {
        Console = new ConsoleBuild();
        Factory = new OrvanoApiFactory(OrvanoApiFactory.DefaultSettings(postgres), Console.ContentRoot);
    }

    public ConsoleBuild Console { get; }

    public OrvanoApiFactory Factory { get; }

    public void Dispose()
    {
        Factory.Dispose();
        Console.Dispose();
    }
}
