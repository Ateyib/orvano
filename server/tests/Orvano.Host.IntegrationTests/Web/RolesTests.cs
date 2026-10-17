using System.Net;

using Orvano.Testing;

namespace Orvano.Host.IntegrationTests.Web;

// Spec 0007 RUN-2: the api role serves HTTP routes and the console; every role answers health checks (IMG-4).
public sealed class RolesTests(PostgresFixture postgres) : IDisposable
{
    private readonly ConsoleBuild _console = new();
    private OrvanoApiFactory? _factory;

    public void Dispose()
    {
        _factory?.Dispose();
        _console.Dispose();
    }

    [Fact, Trait("Spec", "0007:RUN-2")]
    public async Task Worker_only_process_answers_health_but_serves_no_console_when_ORVANO_ROLES_is_worker()
    {
        using HttpClient client = Server("worker").CreateClient();

        using HttpResponseMessage ready = await client.GetAsync("/health/ready", TestContext.Current.CancellationToken);
        using HttpResponseMessage console = await client.GetAsync("/console/", TestContext.Current.CancellationToken);

        ready.StatusCode.ShouldBe(HttpStatusCode.OK);
        console.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact, Trait("Spec", "0007:RUN-2")]
    public async Task Api_only_process_serves_the_console_when_ORVANO_ROLES_is_api()
    {
        using HttpClient client = Server("api").CreateClient();

        using HttpResponseMessage console = await client.GetAsync("/console/", TestContext.Current.CancellationToken);

        console.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    private OrvanoApiFactory Server(string roles)
    {
        Dictionary<string, string> settings = OrvanoApiFactory.DefaultSettings(postgres);
        settings["ROLES"] = roles;
        _factory = new OrvanoApiFactory(settings, _console.ContentRoot);
        return _factory;
    }
}
