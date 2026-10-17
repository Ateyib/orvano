using System.Net;

using Microsoft.AspNetCore.Http;

using Orvano.Testing;

namespace Orvano.Host.IntegrationTests.Web;

// Spec 0006 NET-1: forwarded headers count only from ORVANO_TRUSTED_PROXIES, empty by default; HSTS on HTTPS.
public sealed class ForwardedHeadersTests(PostgresFixture postgres) : IDisposable
{
    private const string Caddy = "10.20.30.40";
    private readonly List<OrvanoApiFactory> _factories = [];

    public void Dispose() => _factories.ForEach(factory => factory.Dispose());

    [Fact, Trait("Spec", "0006:NET-1")]
    public async Task HSTS_is_sent_when_a_trusted_proxy_forwards_HTTPS()
    {
        OrvanoApiFactory factory = Server(trustedProxies: Caddy);

        HttpContext context = await SendAsync(factory, from: Caddy, forwardedProto: "https");

        context.Response.Headers.StrictTransportSecurity.ToString().ShouldBe("max-age=31536000");
    }

    [Fact, Trait("Spec", "0006:NET-1")]
    public async Task Forwarded_HTTPS_is_ignored_when_it_comes_from_an_untrusted_address()
    {
        OrvanoApiFactory factory = Server(trustedProxies: Caddy);

        HttpContext context = await SendAsync(factory, from: "10.20.30.41", forwardedProto: "https");

        context.Response.Headers.ContainsKey("Strict-Transport-Security").ShouldBeFalse();
        context.Connection.RemoteIpAddress?.ToString().ShouldBe("10.20.30.41");
    }

    [Fact, Trait("Spec", "0006:NET-1")]
    public async Task Forwarded_client_address_is_ignored_from_loopback_when_no_proxies_are_trusted()
    {
        OrvanoApiFactory factory = Server(trustedProxies: null);

        HttpContext context = await SendAsync(factory, from: "127.0.0.1", forwardedProto: "https", forwardedFor: "203.0.113.9");

        context.Connection.RemoteIpAddress?.ToString().ShouldBe("127.0.0.1");
        context.Response.Headers.ContainsKey("Strict-Transport-Security").ShouldBeFalse();
    }

    [Fact, Trait("Spec", "0006:NET-1")]
    public async Task Forwarded_client_address_is_used_when_it_comes_from_a_trusted_network()
    {
        OrvanoApiFactory factory = Server(trustedProxies: "10.20.30.0/24");

        HttpContext context = await SendAsync(factory, from: Caddy, forwardedProto: "https", forwardedFor: "203.0.113.9");

        context.Connection.RemoteIpAddress?.ToString().ShouldBe("203.0.113.9");
    }

    private OrvanoApiFactory Server(string? trustedProxies)
    {
        Dictionary<string, string> settings = OrvanoApiFactory.DefaultSettings(postgres);
        if (trustedProxies is not null)
        {
            settings["TRUSTED_PROXIES"] = trustedProxies;
        }

        var factory = new OrvanoApiFactory(settings);
        _factories.Add(factory);
        return factory;
    }

    private static Task<HttpContext> SendAsync(OrvanoApiFactory factory, string from, string forwardedProto, string? forwardedFor = null) =>
        factory.Server.SendAsync(context =>
        {
            context.Request.Method = HttpMethods.Get;
            context.Request.Path = "/health/live";
            context.Connection.RemoteIpAddress = IPAddress.Parse(from);
            context.Request.Headers["X-Forwarded-Proto"] = forwardedProto;
            if (forwardedFor is not null)
            {
                context.Request.Headers["X-Forwarded-For"] = forwardedFor;
            }
        }, TestContext.Current.CancellationToken);
}
