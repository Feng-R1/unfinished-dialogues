import { configuration } from "@/lib/model";

export const dynamic = "force-dynamic";
export function GET() {
  const { mode, ready, modelLabel } = configuration();
  return Response.json({ mode, ready, modelLabel: mode === "live" ? modelLabel : null }, { headers: { "Cache-Control": "no-store" } });
}
