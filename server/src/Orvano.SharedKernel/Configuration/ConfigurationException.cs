namespace Orvano.SharedKernel.Configuration;

/// <summary>
/// Bad configuration found while starting. The message names the environment variable to fix (spec 0002 CFG-4).
/// </summary>
public sealed class ConfigurationException : Exception
{
    public ConfigurationException()
    {
    }

    public ConfigurationException(string message)
        : base(message)
    {
    }

    public ConfigurationException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
