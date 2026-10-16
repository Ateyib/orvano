using System.CommandLine;
using Orvano.Host.Commands;

// Spec 0007 RUN-1: one executable, `serve` by default. Unmatched tokens pass through as configuration
// (spec 0002 CFG-2), which is also how WebApplicationFactory hands over its settings in tests.
var root = new RootCommand("Orvano, the open source, self hostable backend as a service.")
{
    TreatUnmatchedTokensAsErrors = false,
};
root.Subcommands.Add(ServeCommand.Create());
root.Subcommands.Add(MigrateCommand.Create());
root.Subcommands.Add(InitCommand.Create());
root.Subcommands.Add(HealthcheckCommand.Create());
root.Subcommands.Add(AdminCommand.Create());
root.SetAction((parseResult, cancellationToken) => ServeCommand.RunAsync([.. parseResult.UnmatchedTokens], cancellationToken));

// The host handles SIGTERM and Ctrl+C itself, so the command line library does not.
return await root.Parse(args).InvokeAsync(new InvocationConfiguration { ProcessTerminationTimeout = null });

public partial class Program;
