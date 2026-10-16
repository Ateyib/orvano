using System.Collections;
using Microsoft.Extensions.Configuration;

namespace Orvano.SharedKernel.Configuration;

/// <summary>
/// Reads <c>ORVANO_</c> environment variables (spec 0002 CFG-2) and the <c>_FILE</c> form of any key (CFG-3).
/// </summary>
public sealed class OrvanoEnvironmentConfigurationSource : IConfigurationSource
{
    /// <summary>The variables to read; the process environment when not set.</summary>
    public IDictionary? Variables { get; init; }

    public IConfigurationProvider Build(IConfigurationBuilder builder) =>
        new OrvanoEnvironmentConfigurationProvider(Variables ?? Environment.GetEnvironmentVariables());
}
