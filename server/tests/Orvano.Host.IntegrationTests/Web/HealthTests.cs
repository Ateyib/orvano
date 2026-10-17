using System.Net;

namespace Orvano.Host.IntegrationTests.Web;

// Spec 0002 LOG-6: live means the process is up; ready means the platform database answers, no migrations pending.
public sealed class HealthTests(ConsoleServerFixture server) : IClassFixture<ConsoleServerFixture>
{
    [Theory, Trait("Spec", "0002:LOG-6")]
    [InlineData("/health/live")]
    [InlineData("/health/ready")]
    public async Task Health_returns_200_Healthy_when_the_platform_database_answers(string path)
    {
        using HttpClient client = server.Factory.CreateClient();

        using HttpResponseMessage response = await client.GetAsync(path, TestContext.Current.CancellationToken);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)).ShouldBe("Healthy");
    }

    [Fact, Trait("Spec", "0002:LOG-6")]
    public async Task Health_is_never_cached_when_probed()
    {
        using HttpClient client = server.Factory.CreateClient();

        using HttpResponseMessage response = await client.GetAsync("/health/ready", TestContext.Current.CancellationToken);

        response.Headers.CacheControl?.NoStore.ShouldBeTrue();
    }
}
