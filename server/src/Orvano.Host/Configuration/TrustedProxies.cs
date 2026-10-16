using System.Net;
using Microsoft.AspNetCore.HttpOverrides;
using Orvano.SharedKernel.Configuration;

namespace Orvano.Host.Configuration;

/// <summary>
/// Forwarded headers are trusted only from the addresses in <c>ORVANO_TRUSTED_PROXIES</c>, empty by default
/// (spec 0006 NET-1). Entries are IP addresses or CIDR networks, separated by commas.
/// ASP.NET Core's forwarded headers middleware skips its address check when both known lists are empty, so it must
/// run only when <see cref="Configure"/> trusted at least one entry.
/// </summary>
internal static class TrustedProxies
{
    public const string ConfigurationKey = "TRUSTED_PROXIES";

    /// <returns>True when at least one proxy or network is trusted.</returns>
    public static bool Configure(ForwardedHeadersOptions options, string? value)
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.ForwardLimit = 1;

        // The defaults trust loopback; Orvano trusts nothing it was not told to.
        options.KnownProxies.Clear();
        options.KnownIPNetworks.Clear();

        foreach (var entry in (value ?? string.Empty).Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
        {
            if (IPAddress.TryParse(entry, out var address))
            {
                options.KnownProxies.Add(address);
            }
            else if (System.Net.IPNetwork.TryParse(entry, out var network))
            {
                options.KnownIPNetworks.Add(network);
            }
            else
            {
                throw new ConfigurationException(
                    $"ORVANO_TRUSTED_PROXIES has '{entry}', which is not an IP address or CIDR network.");
            }
        }

        return options.KnownProxies.Count > 0 || options.KnownIPNetworks.Count > 0;
    }
}
