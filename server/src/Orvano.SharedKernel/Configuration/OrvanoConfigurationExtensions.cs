using Microsoft.Extensions.Configuration;

namespace Orvano.SharedKernel.Configuration;

public static class OrvanoConfigurationExtensions
{
    /// <summary>
    /// Adds Orvano's sources after the defaults so they win (spec 0002 CFG-2): the JSON file named by
    /// <c>ORVANO_CONFIG_FILE</c>, then <c>ORVANO_</c> variables with their <c>_FILE</c> forms, then the command line.
    /// </summary>
    public static IConfigurationBuilder AddOrvanoConfiguration(this IConfigurationBuilder builder, string[] args)
    {
        var configFile = Environment.GetEnvironmentVariable(ConfigurationNames.Prefix + "CONFIG_FILE");
        if (!string.IsNullOrWhiteSpace(configFile))
        {
            if (!File.Exists(configFile))
            {
                throw new ConfigurationException($"ORVANO_CONFIG_FILE points to '{configFile}', which does not exist.");
            }

            builder.AddJsonFile(Path.GetFullPath(configFile), optional: false, reloadOnChange: false);
        }

        builder.Add(new OrvanoEnvironmentConfigurationSource());
        builder.AddCommandLine(args);
        return builder;
    }
}
