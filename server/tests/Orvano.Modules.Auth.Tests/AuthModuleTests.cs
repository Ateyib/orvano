using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using Orvano.Modules.Auth.Contracts;

using Shouldly;

using Xunit;

namespace Orvano.Modules.Auth.Tests;

public sealed class AuthModuleTests
{
    [Fact]
    public void AddAuthModule_registers_one_shared_password_hasher_when_called()
    {
        using ServiceProvider services = new ServiceCollection().AddAuthModule(new ConfigurationBuilder().Build()).BuildServiceProvider();

        services.GetRequiredService<IPasswordHasher>().ShouldBeSameAs(services.GetRequiredService<IPasswordHasher>());
    }
}
