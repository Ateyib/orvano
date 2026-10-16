using System.Reflection;
using Npgsql;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Orvano.Host.Telemetry;

internal static class HostTelemetry
{
    public static string Version { get; } =
        typeof(HostTelemetry).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "0.0.0";

    /// <summary>Console logs are JSON outside Development (spec 0002 LOG-4).</summary>
    public static IHostApplicationBuilder AddOrvanoLogging(this IHostApplicationBuilder builder)
    {
        if (!builder.Environment.IsDevelopment())
        {
            builder.Logging.AddJsonConsole();
        }

        return builder;
    }

    /// <summary>
    /// OpenTelemetry traces, metrics, and logs (spec 0002 LOG-4, LOG-5). OTLP export turns on only when
    /// <c>OTEL_EXPORTER_OTLP_ENDPOINT</c> is set.
    /// </summary>
    public static IHostApplicationBuilder AddOrvanoTelemetry(this IHostApplicationBuilder builder)
    {
        builder.Logging.AddOpenTelemetry(logging =>
        {
            logging.IncludeFormattedMessage = true;
            logging.IncludeScopes = true;
        });

        var telemetry = builder.Services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService("orvano", serviceVersion: Version))
            .WithTracing(tracing => tracing
                .AddSource("Orvano.*")
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddNpgsql())
            .WithMetrics(metrics => metrics
                .AddMeter("Orvano.*")
                .AddMeter("Npgsql")
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddRuntimeInstrumentation());

        if (!string.IsNullOrWhiteSpace(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]))
        {
            telemetry.UseOtlpExporter();
        }

        return builder;
    }
}
