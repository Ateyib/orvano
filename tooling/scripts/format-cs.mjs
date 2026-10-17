// Spec 0008 HOK-2: formats the staged C# files that `vp staged` passes in. dotnet format wants paths relative to
// the folder it formats (and runs there, so server/global.json picks the SDK), and Windows command lines are
// short, so paths go in chunks of 50.
import { spawnSync } from "node:child_process";
import { relative, resolve } from "node:path";

const serverDir = resolve("server");
const paths = process.argv
  .slice(2)
  .map((file) => relative(serverDir, resolve(file)))
  .filter((path) => !path.startsWith(".."))
  .map((path) => path.split("\\").join("/"));

const chunkSize = 50;
let exitCode = 0;
for (let start = 0; start < paths.length; start += chunkSize) {
  const chunk = paths.slice(start, start + chunkSize);
  const result = spawnSync(
    "dotnet",
    ["format", "whitespace", ".", "--folder", "--include", ...chunk],
    { stdio: "inherit", cwd: serverDir },
  );
  if (result.status !== 0) {
    exitCode = result.status ?? 1;
    break;
  }
}
process.exit(exitCode);
