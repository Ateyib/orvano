using System.Reflection;
using Microsoft.Extensions.Options;
using Orvano.SharedKernel.Configuration;

namespace Orvano.Host.Configuration;

internal static class OptionsErrors
{
    /// <summary>Spec 0002 CFG-4: the message names the environment variables to fix.</summary>
    public static string Describe(OptionsValidationException exception)
    {
        var section = exception.OptionsType.GetField("Section", BindingFlags.Public | BindingFlags.Static)?.GetValue(null) as string;
        return "Configuration is not valid:" + Environment.NewLine + "  "
            + string.Join(Environment.NewLine + "  ", ConfigurationNames.Describe(exception, section ?? string.Empty));
    }
}
