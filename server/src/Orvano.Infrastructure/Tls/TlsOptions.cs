using System.ComponentModel.DataAnnotations;

namespace Orvano.Infrastructure.Tls;

/// <summary>Kestrel's own HTTPS from operator supplied PEM files (spec 0007 TLS-2).</summary>
public sealed class TlsOptions : IValidatableObject
{
    public const string Section = "Tls";

    /// <summary>Path to the PEM certificate chain. Set together with <see cref="KeyFile"/>.</summary>
    public string? CertFile { get; init; }

    /// <summary>Path to the PEM private key. Set together with <see cref="CertFile"/>.</summary>
    public string? KeyFile { get; init; }

    /// <summary>True when both files are set and Kestrel serves HTTPS on 8443.</summary>
    public bool IsEnabled => !string.IsNullOrWhiteSpace(CertFile) && !string.IsNullOrWhiteSpace(KeyFile);

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(CertFile) != string.IsNullOrWhiteSpace(KeyFile))
        {
            yield return new ValidationResult(
                "Set both ORVANO_TLS__CERTFILE and ORVANO_TLS__KEYFILE, or neither.",
                [nameof(CertFile), nameof(KeyFile)]);
        }
    }
}
