using System.Buffers.Text;
using System.CommandLine;
using System.Globalization;
using System.Runtime.Versioning;
using System.Security.Cryptography;
using System.Text;
using Orvano.Infrastructure.RootKeys;

namespace Orvano.Host.Commands;

/// <summary>
/// <c>orvano init</c>: run once before the first <c>compose up</c>, as the operator's own user. Writes <c>root.key</c> and
/// a <c>.env</c> with generated database passwords into a 0700 folder, and refuses to overwrite either
/// (spec 0007 INS-3, INS-5, spec 0006 SCR-2).
/// It needs no configuration, database, or root key.
/// </summary>
internal static class InitCommand
{
    // Spec 0007 INS-5: root.key 0644 and .env 0600, inside a 0700 folder.
    private const UnixFileMode OwnerOnly = UnixFileMode.UserRead | UnixFileMode.UserWrite;
    private const UnixFileMode KeyMode = OwnerOnly | UnixFileMode.GroupRead | UnixFileMode.OtherRead;
    private const UnixFileMode FolderMode = OwnerOnly | UnixFileMode.UserExecute;
    private const UnixFileMode AllPermissions = (UnixFileMode)0b111_111_111;

    private const string UserHint =
        "Run init as yourself: docker run --user \"$(id -u):$(id -g)\" ... (rootless Podman: podman run --userns=keep-id ...).";

    private const string FolderHint =
        "Use a folder you own on a local disk (chown it to yourself, or make a new one), not FAT, NFS, or a shared folder.";

    public static Command Create()
    {
        var output = new Option<DirectoryInfo>("--out")
        {
            Description = "The install folder to write root.key and .env into.",
            Required = true,
        };
        var domain = new Option<string>("--domain")
        {
            Description = "The domain Orvano is served on, for example orvano.example.com.",
            Required = true,
        };
        // A string, parsed below: System.CommandLine has no parser for Uri and would crash instead of explaining.
        var publicUrl = new Option<string?>("--public-url")
        {
            Description = "The URL clients use to reach Orvano. Defaults to https://<domain>.",
        };

        var command = new Command("init", "Create the root key and .env for a new install.") { output, domain, publicUrl };
        command.SetAction(parseResult => Run(
            parseResult.GetRequiredValue(output), parseResult.GetRequiredValue(domain), parseResult.GetValue(publicUrl)));
        return command;
    }

    private static int Run(DirectoryInfo output, string domain, string? publicUrlText)
    {
        if (Uri.CheckHostName(domain) is UriHostNameType.Unknown)
        {
            Console.Error.WriteLine($"'{domain}' is not a valid domain.");
            return 1;
        }

        if (!Uri.TryCreate(publicUrlText ?? $"https://{domain}", UriKind.Absolute, out var publicUrl)
            || publicUrl.Scheme is not ("https" or "http"))
        {
            Console.Error.WriteLine("--public-url must be an absolute http or https URL.");
            return 1;
        }

        var keyPath = Path.Combine(output.FullName, "root.key");
        var envPath = Path.Combine(output.FullName, ".env");

        // Spec 0007 INS-5, step 1: refuse before changing anything, not even the folder's mode.
        foreach (var path in new[] { keyPath, envPath })
        {
            if (File.Exists(path))
            {
                Console.Error.WriteLine($"{path} already exists. init never overwrites an install; move it away first.");
                return 1;
            }
        }

        try
        {
            output.Create();
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            Console.Error.WriteLine($"Cannot write to {output.FullName}: {ex.Message}");
            Console.Error.WriteLine(UserHint);
            return 1;
        }

        if (!OperatingSystem.IsWindows() && !RestrictFolder(output.FullName))
        {
            return 1;
        }

        // Step 4: .env, then root.key; anything this run created goes again on failure.
        var created = new List<string>();
        try
        {
            Write(envPath, EnvironmentFile(domain, publicUrl), created);
            Write(keyPath, RootKey.Generate() + "\n", created);
            if (!OperatingSystem.IsWindows())
            {
                File.SetUnixFileMode(keyPath, KeyMode); // explicit, so a strict umask cannot leave it at 0600
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            created.ForEach(File.Delete);
            Console.Error.WriteLine($"Cannot write to {output.FullName}: {ex.Message}");
            Console.Error.WriteLine(UserHint);
            return 1;
        }

        Console.WriteLine($"Wrote {keyPath} and {envPath}.");
        if (OperatingSystem.IsWindows())
        {
            Console.WriteLine("File modes are skipped on Windows; keep this folder private to your account.");
        }

        Console.WriteLine();
        Console.WriteLine("BACK UP root.key NOW, and keep it apart from your database backups.");
        Console.WriteLine("It encrypts every stored secret. If you lose it, those secrets cannot be recovered.");
        Console.WriteLine("root.key is safe only inside this folder. Make any copy owner only (chmod 600) or encrypt it.");
        Console.WriteLine("Run docker compose as the same user that ran init.");
        return 0;
    }

    /// <summary>Spec 0007 INS-5, steps 2 and 3: the folder becomes 0700, and the mode must read back.</summary>
    [UnsupportedOSPlatform("windows")]
    private static bool RestrictFolder(string folder)
    {
        try
        {
            File.SetUnixFileMode(folder, FolderMode);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            Console.Error.WriteLine($"Cannot set {folder} to mode 0700: {ex.Message}");
            Console.Error.WriteLine(FolderHint);
            return false;
        }

        var mode = File.GetUnixFileMode(folder) & AllPermissions;
        if (mode != FolderMode)
        {
            Console.Error.WriteLine($"{folder} stays at mode {Octal(mode)} instead of 0700, so root.key could not be protected.");
            Console.Error.WriteLine(FolderHint);
            return false;
        }

        Console.WriteLine($"Set {folder} to mode 0700 (only you can open it).");
        return true;
    }

    private static string EnvironmentFile(string domain, Uri publicUrl)
    {
        var created = TimeProvider.System.GetUtcNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var text = new StringBuilder()
            .AppendLine(CultureInfo.InvariantCulture, $"# Written by orvano init on {created}. Keep this file private; it holds passwords.")
            .AppendLine("# deploy/.env.example explains every variable.")
            .AppendLine(CultureInfo.InvariantCulture, $"ORVANO_DOMAIN={domain}")
            .AppendLine(CultureInfo.InvariantCulture, $"ORVANO_PUBLIC_URL={publicUrl.GetLeftPart(UriPartial.Authority)}")
            .AppendLine(CultureInfo.InvariantCulture, $"POSTGRES_PASSWORD={NewPassword()}")
            .AppendLine(CultureInfo.InvariantCulture, $"ORVANO_DB_PASSWORD={NewPassword()}")
            .AppendLine(CultureInfo.InvariantCulture, $"ORVANO_PROVISIONER_PASSWORD={NewPassword()}");
        return text.ToString();
    }

    private static string NewPassword() => Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(32));

    private static void Write(string path, string contents, List<string> created)
    {
        var options = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.Write };
        if (!OperatingSystem.IsWindows())
        {
            options.UnixCreateMode = OwnerOnly;
        }

        using var stream = new FileStream(path, options);
        created.Add(path);
        stream.Write(Encoding.UTF8.GetBytes(contents));
    }

    private static string Octal(UnixFileMode mode) => "0" + Convert.ToString((int)mode, 8);
}
