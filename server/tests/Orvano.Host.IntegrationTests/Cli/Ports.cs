using System.Net;
using System.Net.Sockets;

namespace Orvano.Host.IntegrationTests.Cli;

internal static class Ports
{
    /// <summary>A port nothing listens on right now.</summary>
    public static int Free()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        return ((IPEndPoint)listener.LocalEndpoint).Port;
    }
}
