import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const env = { ...process.env, UNFINISHED_BUILD_DIR: ".next-release", NEXT_TELEMETRY_DISABLED: "1" };
// Empty values take precedence over Next.js loading a developer's ignored .env.local.
for (const name of ["MODEL_API_KEY", "MODEL_BASE_URL", "MODEL_NAME"]) env[name] = "";
const generatedConfig = ["next-env.d.ts", "tsconfig.json"];
const original = new Map(await Promise.all(generatedConfig.map(async file => [file, await readFile(resolve(import.meta.dirname, "..", file))])));
try {
  const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build", "--webpack"], { stdio: "inherit", env, windowsHide: true });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await Promise.all([...original].map(([file, contents]) => writeFile(resolve(import.meta.dirname, "..", file), contents)));
}
