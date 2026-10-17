using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Orvano.Infrastructure.Tls;

namespace Orvano.Infrastructure;

/// <summary>Registers what <c>Orvano.Infrastructure</c> owns (spec 0007 REP-2), one call from <c>Orvano.Host</c>.</summary>
public static class InfrastructureServices
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddOptions<TlsOptions>().BindConfiguration(TlsOptions.Section).ValidateOnStart();
        services.AddSingleton<IValidateOptions<TlsOptions>, TlsOptionsValidator>();
        return services;
    }
}
