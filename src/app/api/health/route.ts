import packageJson from "../../../../package.json";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ app: "unfinished-dialogues", version: packageJson.version, instance: process.env.UNFINISHED_INSTANCE ?? null }, {
    headers: { "Cache-Control": "no-store" },
  });
}
