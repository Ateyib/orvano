using Microsoft.Extensions.Options;

namespace Orvano.Infrastructure.Tls;

[OptionsValidator]
internal sealed partial class TlsOptionsValidator : IValidateOptions<TlsOptions>;
