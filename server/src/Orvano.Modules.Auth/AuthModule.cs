using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using Orvano.Modules.Auth.Contracts;
using Orvano.Modules.Auth.Passwords;

namespace Orvano.Modules.Auth;

public static class AuthModule
{
    public static IServiceCollection AddAuthModule(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        services.AddSingleton<IPasswordHasher, Argon2idPasswordHasher>();
        return services;
    }
}
