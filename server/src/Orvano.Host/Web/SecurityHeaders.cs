namespace Orvano.Host.Web;

internal static class SecurityHeaders
{
    // Spec 0006 NET-2.
    private const string ConsolePolicy =
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; "
        + "base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

    private const string ConsolePermissions = "camera=(), microphone=(), geolocation=(), payment=(), usb=()";

    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app) =>
        app.Use((context, next) =>
        {
            var headers = context.Response.Headers;
            headers.XContentTypeOptions = "nosniff";

            // Spec 0006 NET-1: HSTS whenever the server sees HTTPS (directly, or from a trusted proxy).
            if (context.Request.IsHttps)
            {
                headers.StrictTransportSecurity = "max-age=31536000";
            }

            if (context.Request.Path.StartsWithSegments(ConsoleFiles.BasePath, StringComparison.OrdinalIgnoreCase))
            {
                headers.ContentSecurityPolicy = ConsolePolicy;
                headers["Referrer-Policy"] = "same-origin";
                headers["Cross-Origin-Opener-Policy"] = "same-origin";
                headers["Permissions-Policy"] = ConsolePermissions;
            }

            return next(context);
        });
}
