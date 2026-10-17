using System.Net;

using Orvano.Testing;

namespace Orvano.Host.IntegrationTests.Web;

// Spec 0007 CSL-1, CSL-2, RUN-4: the console at /console, hashed assets cached for a year, an index.html fallback.
public sealed class ConsoleServingTests(ConsoleServerFixture server) : IClassFixture<ConsoleServerFixture>
{
    private readonly HttpClient _client = server.Factory.CreateClient(new() { AllowAutoRedirect = false });

    [Fact, Trait("Spec", "0007:RUN-4")]
    public async Task Root_redirects_to_the_console_when_requested()
    {
        using HttpResponseMessage response = await _client.GetAsync("/", TestContext.Current.CancellationToken);

        response.StatusCode.ShouldBe(HttpStatusCode.Redirect);
        response.Headers.Location?.OriginalString.ShouldBe("/console/");
    }

    [Theory, Trait("Spec", "0007:CSL-2")]
    [InlineData("/console")]
    [InlineData("/console/")]
    [InlineData("/console/acme/projects/42/databases")]
    public async Task Console_route_returns_index_html_uncached_when_no_file_matches(string path)
    {
        using HttpResponseMessage response = await _client.GetAsync(path, TestContext.Current.CancellationToken);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.ShouldBe("text/html");
        response.Headers.CacheControl?.NoCache.ShouldBeTrue();
        (await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)).ShouldContain(ConsoleBuild.IndexMarker);
    }

    [Fact, Trait("Spec", "0007:CSL-2")]
    public async Task Hashed_asset_is_served_as_itself_and_cached_for_a_year_when_it_exists()
    {
        using HttpResponseMessage response = await _client.GetAsync("/console/" + ConsoleBuild.HashedAsset, TestContext.Current.CancellationToken);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.ShouldBe("text/javascript");
        response.Headers.CacheControl?.ToString().ShouldBe("public, max-age=31536000, immutable");
        (await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)).ShouldNotContain(ConsoleBuild.IndexMarker);
    }

    [Fact, Trait("Spec", "0007:CSL-2")]
    public async Task Unhashed_file_is_served_but_not_cached_when_it_exists_outside_assets()
    {
        using HttpResponseMessage response = await _client.GetAsync("/console/" + ConsoleBuild.PlainFile, TestContext.Current.CancellationToken);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.ShouldBe("image/svg+xml");
        response.Headers.CacheControl?.NoCache.ShouldBeTrue();
    }

    [Fact, Trait("Spec", "0007:CSL-2")]
    public async Task Missing_asset_falls_back_to_index_html_when_no_file_matches()
    {
        using HttpResponseMessage response = await _client.GetAsync("/console/assets/gone-123.js", TestContext.Current.CancellationToken);

        (await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)).ShouldContain(ConsoleBuild.IndexMarker);
    }

    [Theory, Trait("Spec", "0006:NET-2")]
    [InlineData("/console/")]
    [InlineData("/console/" + ConsoleBuild.HashedAsset)]
    public async Task Console_response_carries_the_NET2_security_headers_when_served(string path)
    {
        using HttpResponseMessage response = await _client.GetAsync(path, TestContext.Current.CancellationToken);

        Header(response, "Content-Security-Policy").ShouldBe(
            "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; "
            + "base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
        Header(response, "Referrer-Policy").ShouldBe("same-origin");
        Header(response, "X-Content-Type-Options").ShouldBe("nosniff");
        Header(response, "Cross-Origin-Opener-Policy").ShouldBe("same-origin");
        Header(response, "Permissions-Policy").ShouldNotBeNullOrWhiteSpace();
    }

    [Fact, Trait("Spec", "0006:NET-2")]
    public async Task Non_console_path_gets_404_without_the_console_policy_when_nothing_matches()
    {
        using HttpResponseMessage response = await _client.GetAsync("/nope", TestContext.Current.CancellationToken);

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
        response.Headers.Contains("Content-Security-Policy").ShouldBeFalse();
        Header(response, "X-Content-Type-Options").ShouldBe("nosniff");
    }

    [Fact, Trait("Spec", "0006:NET-1")]
    public async Task HSTS_is_not_sent_when_the_request_is_plain_HTTP()
    {
        using HttpResponseMessage response = await _client.GetAsync("/console/", TestContext.Current.CancellationToken);

        response.Headers.Contains("Strict-Transport-Security").ShouldBeFalse();
    }

    private static string? Header(HttpResponseMessage response, string name) =>
        response.Headers.TryGetValues(name, out IEnumerable<string>? values) || response.Content.Headers.TryGetValues(name, out values)
            ? string.Join(", ", values)
            : null;
}
