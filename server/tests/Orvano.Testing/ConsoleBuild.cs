namespace Orvano.Testing;

/// <summary>
/// A stand in for the built console, laid out as the image lays it out (<c>wwwroot/console</c>, spec 0007 CSL-1).
/// Use the folder as the server's content root.
/// </summary>
public sealed class ConsoleBuild : IDisposable
{
    public const string IndexMarker = "<!-- orvano console index -->";
    public const string HashedAsset = "assets/index-AbC123xy.js";
    public const string PlainFile = "favicon.svg";

    public ConsoleBuild()
    {
        ContentRoot = Directory.CreateTempSubdirectory("orvano-console-").FullName;
        var console = Path.Combine(ContentRoot, "wwwroot", "console");
        Directory.CreateDirectory(Path.Combine(console, "assets"));
        File.WriteAllText(Path.Combine(console, "index.html"), $"<!doctype html><html>{IndexMarker}</html>");
        File.WriteAllText(Path.Combine(console, HashedAsset), "export const app = 1;");
        File.WriteAllText(Path.Combine(console, PlainFile), "<svg xmlns=\"http://www.w3.org/2000/svg\"/>");
    }

    public string ContentRoot { get; }

    public void Dispose() => Directory.Delete(ContentRoot, recursive: true);
}
