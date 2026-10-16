using Microsoft.Extensions.Options;

namespace Orvano.Host.Database;

[OptionsValidator]
internal sealed partial class DatabaseOptionsValidator : IValidateOptions<DatabaseOptions>;
