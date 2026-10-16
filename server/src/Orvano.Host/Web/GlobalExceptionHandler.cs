using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Orvano.Host.Web;

/// <summary>
/// Spec 0002 ERR-4: anything unhandled becomes a 500 ProblemDetails with a generic message and the trace ID.
/// A caller that left gets no body; any other cancellation is a server side timeout (503).
/// </summary>
internal sealed class GlobalExceptionHandler(IProblemDetailsService problems, ILogger<GlobalExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is OperationCanceledException && httpContext.RequestAborted.IsCancellationRequested)
        {
            logger.RequestAborted();
            httpContext.Response.StatusCode = StatusCodes.Status499ClientClosedRequest;
            return true;
        }

        var timeout = exception is OperationCanceledException;
        if (timeout)
        {
            logger.ServerTimeout(exception);
        }
        else
        {
            logger.UnhandledException(exception);
        }

        var status = timeout ? StatusCodes.Status503ServiceUnavailable : StatusCodes.Status500InternalServerError;
        httpContext.Response.StatusCode = status;
        return await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = new ProblemDetails
            {
                Status = status,
                Title = timeout ? "The server took too long to answer." : "Something went wrong on the server.",
                Extensions = { ["code"] = timeout ? "timeout" : "internal_error" },
            },
        });
    }
}
