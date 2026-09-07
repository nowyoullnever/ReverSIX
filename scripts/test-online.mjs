import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
const env = { ...process.env, CI: "true" };
if (process.platform === "win32") {
  // Avoid Windows Java AF_UNIX errors with long or spaced temp paths.
  mkdirSync("work", { recursive: true });
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "(New-Object -ComObject Scripting.FileSystemObject).GetFolder((Join-Path (Get-Location) 'work')).ShortPath",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0)
    throw new Error(result.stderr || "Cannot resolve Java temporary directory");
  env.JAVA_TOOL_OPTIONS =
    `${env.JAVA_TOOL_OPTIONS ?? ""} -Djdk.net.unixdomain.tmpdir=${result.stdout.trim()}`.trim();
}
const child = spawn(
  process.execPath,
  [
    resolve("node_modules/firebase-tools/lib/bin/firebase.js"),
    "emulators:exec",
    "--only",
    "database",
    "--project",
    "demo-reversix",
    "vitest run tests/emulator.test.ts",
  ],
  { stdio: "inherit", env },
);
child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
