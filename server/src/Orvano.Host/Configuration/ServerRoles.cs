using Orvano.SharedKernel.Configuration;

namespace Orvano.Host.Configuration;

/// <summary>The roles one <c>serve</c> process runs, from <c>ORVANO_ROLES</c> (spec 0007 RUN-2).</summary>
internal sealed record ServerRoles(bool Api, bool Worker)
{
    public const string ConfigurationKey = "ROLES";

    public override string ToString() => (Api, Worker) switch
    {
        (true, true) => "api,worker",
        (true, false) => "api",
        _ => "worker",
    };

    public static ServerRoles Parse(string? value)
    {
        var roles = (value ?? "api,worker").Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        if (roles.Length == 0)
        {
            throw new ConfigurationException("ORVANO_ROLES is empty. Use api, worker, or api,worker.");
        }

        bool api = false, worker = false;
        foreach (var role in roles)
        {
            if (role.Equals("api", StringComparison.OrdinalIgnoreCase))
            {
                api = true;
            }
            else if (role.Equals("worker", StringComparison.OrdinalIgnoreCase))
            {
                worker = true;
            }
            else
            {
                throw new ConfigurationException($"ORVANO_ROLES has an unknown role '{role}'. Use api, worker, or api,worker.");
            }
        }

        return new ServerRoles(api, worker);
    }
}
