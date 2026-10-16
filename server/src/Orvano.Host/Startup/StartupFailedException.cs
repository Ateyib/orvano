namespace Orvano.Host.Startup;

/// <summary>A startup check failed; the message tells the operator what to do.</summary>
internal sealed class StartupFailedException(string message, Exception? innerException = null)
    : Exception(message, innerException);
