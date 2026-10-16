using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace Orvano.SharedKernel.Configuration;

/// <summary>
/// Turns configuration keys into the <c>ORVANO_</c> environment variable names that set them (spec 0002 CFG-2, CFG-4).
/// </summary>
public static partial class ConfigurationNames
{
    public const string Prefix = "ORVANO_";

    /// <summary><c>Auth:SessionLifetime</c> becomes <c>ORVANO_AUTH__SESSIONLIFETIME</c>.</summary>
    public static string ToEnvironmentVariable(string key) =>
        Prefix + key.Replace(":", "__", StringComparison.Ordinal).ToUpperInvariant();

    /// <summary>
    /// Describes each failure of an options validation, naming the variables of the members that failed.
    /// </summary>
    public static IReadOnlyList<string> Describe(OptionsValidationException exception, string section)
    {
        var lines = new List<string>();
        foreach (var failure in exception.Failures)
        {
            var members = MembersPattern().Match(failure);
            if (!members.Success)
            {
                lines.Add(failure);
                continue;
            }

            var names = members.Groups["members"].Value
                .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .Select(member => member.Replace('.', ':'))
                .Select(member => ToEnvironmentVariable(string.IsNullOrEmpty(section) ? member : $"{section}:{member}"));
            lines.Add(string.Create(CultureInfo.InvariantCulture, $"{string.Join(", ", names)}: {members.Groups["error"].Value}"));
        }

        return lines;
    }

    // The source generated [OptionsValidator] writes "Member: message"; DataAnnotations validation writes
    // "... members: 'A,B' with the error: 'message'."
    [GeneratedRegex("^(?:(?<members>[A-Za-z0-9_.]+(?:, [A-Za-z0-9_.]+)*): |.*members: '(?<members>[^']*)' with the error: ')(?<error>.*?)'?\\.?$",
        RegexOptions.CultureInvariant)]
    private static partial Regex MembersPattern();
}
