import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pkg = JSON.parse(await readFile(resolve(import.meta.dirname, "../package.json"), "utf8"));
const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME;
if (tag !== `v${pkg.version}`) throw new Error(`Release tag must be v${pkg.version}`);
console.log(`Release tag ${tag} matches package version ${pkg.version}`);
