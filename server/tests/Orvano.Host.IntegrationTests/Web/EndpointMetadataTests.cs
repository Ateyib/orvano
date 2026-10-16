using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Orvano.Host.IntegrationTests.Web;

// Spec 0002 API-4: every endpoint states its authorization or AllowAnonymous explicitly.
public sealed class EndpointMetadataTests(ConsoleServerFixture server) : IClassFixture<ConsoleServerFixture>
{
    [Fact, Trait("Spec", "0002:API-4")]
    public void Every_endpoint_declares_authorization_or_anonymous_access_when_mapped()
    {
        using var client = server.Factory.CreateClient(); // starts the host
        var endpoints = server.Factory.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>().ToList();

        endpoints.ShouldNotBeEmpty();
        endpoints
            .Where(endpoint => endpoint.Metadata.GetMetadata<IAllowAnonymous>() is null
                               && endpoint.Metadata.GetMetadata<IAuthorizeData>() is null)
            .Select(endpoint => endpoint.RoutePattern.RawText)
            .ShouldBeEmpty();
    }
}
