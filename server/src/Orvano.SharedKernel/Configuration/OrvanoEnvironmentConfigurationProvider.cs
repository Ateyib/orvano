using System.Collections;

using Microsoft.Extensions.Configuration;

namespace Orvano.SharedKernel.Configuration;

internal sealed class OrvanoEnvironmentConfigurationProvider(IDictionary variables) : ConfigurationProvider
{
    private const string FileSuffix = "_FILE";

    // ORVANO_CONFIG_FILE names the optional JSON file (CFG-2); it is a path, not a key read from a file.
    private const string ConfigFileVariable = ConfigurationNames.Prefix + "CONFIG_FILE";

    public override void Load()
    {
        var plain = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        var files = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (DictionaryEntry entry in variables)
        {
            string? name = entry.Key.ToString();
            if (name is null
                || !name.StartsWith(ConfigurationNames.Prefix, StringComparison.OrdinalIgnoreCase)
                || name.Equals(ConfigFileVariable, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            string key = name[ConfigurationNames.Prefix.Length..];
            if (key.EndsWith(FileSuffix, StringComparison.OrdinalIgnoreCase))
            {
                files[ToKey(key[..^FileSuffix.Length])] = entry.Value?.ToString() ?? string.Empty;
            }
            else
            {
                plain[ToKey(key)] = entry.Value?.ToString();
            }
        }

        var data = new Dictionary<string, string?>(plain, StringComparer.OrdinalIgnoreCase);
        foreach ((string? key, string? path) in files)
        {
            if (plain.ContainsKey(key))
            {
                string variable = ConfigurationNames.ToEnvironmentVariable(key);
                throw new ConfigurationException($"Set {variable} or {variable}{FileSuffix}, not both.");
            }

            data[key] = ReadSecretFile(key, path);
        }

        Data = data;
    }

    private static string ToKey(string variableKey) => variableKey.Replace("__", ConfigurationPath.KeyDelimiter, StringComparison.Ordinal);

    private static string ReadSecretFile(string key, string path)
    {
        string contents;
        try
        {
            contents = File.ReadAllText(path);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or ArgumentException or NotSupportedException)
        {
            throw new ConfigurationException(
                $"{ConfigurationNames.ToEnvironmentVariable(key)}{FileSuffix} points to '{path}', which cannot be read.", ex);
        }

        // Exactly one trailing newline is trimmed (CFG-3).
        if (contents.EndsWith("\r\n", StringComparison.Ordinal))
        {
            return contents[..^2];
        }

        return contents.EndsWith('\n') ? contents[..^1] : contents;
    }
}
