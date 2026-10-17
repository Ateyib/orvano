using System.CommandLine;
using System.Globalization;

namespace Orvano.Host.Commands;

/// <summary>
/// <c>orvano healthcheck</c>: calls <c>/health/ready</c> on the local port and exits 0 or 1, so the image needs no
/// <c>curl</c> (spec 0007 IMG-4). It builds no web host and needs no configuration.
/// </summary>
internal static class HealthcheckCommand
{
    public static Command Create()
    {
        var port = new Option<int?>("--port")
        {
            Description = "The local HTTP port. Defaults to the first of ASPNETCORE_HTTP_PORTS, else 8080.",
        };
        var command = new Command("healthcheck", "Exit 0 when the local server is ready, 1 otherwise.") { port };
        command.SetAction((parseResult, cancellationToken) => RunAsync(parseResult.GetValue(port), cancellationToken));
        return command;
    }

    private static async Task<int> RunAsync(int? port, CancellationToken cancellationToken)
    {
        port ??= DefaultPort();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5), TimeProvider.System);
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeout.Token);

        // Spec 0002 PRF-3: clients come from the factory, even for this one shot probe.
        await using ServiceProvider services = new ServiceCollection().AddHttpClient().BuildServiceProvider();
        using HttpClient http = services.GetRequiredService<IHttpClientFactory>().CreateClient();
        try
        {
            using HttpResponseMessage response = await http.GetAsync(
                new Uri(string.Create(CultureInfo.InvariantCulture, $"http://127.0.0.1:{port}/health/ready")), linked.Token);
            return response.IsSuccessStatusCode ? 0 : 1;
        }
        catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException)
        {
            return 1;
        }
    }

    private static int DefaultPort()
    {
        string? ports = Environment.GetEnvironmentVariable("ASPNETCORE_HTTP_PORTS");
        string? first = ports?.Split([',', ';'], StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        return int.TryParse(first, NumberStyles.None, CultureInfo.InvariantCulture, out int port) ? port : 8080;
    }
}
