import { spawnSync } from "node:child_process";

const env = { ...process.env, UNFINISHED_BUILD_DIR: ".next-release", NEXT_TELEMETRY_DISABLED: "1" };
// Empty values take precedence over Next.js loading a developer's ignored .env.local.
for (const name of ["MODEL_API_KEY", "MODEL_BASE_URL", "MODEL_NAME"]) env[name] = "";
const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build", "--webpack"], { stdio: "inherit", env, windowsHide: true });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
