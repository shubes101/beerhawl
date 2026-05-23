import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { reseed } from "@/lib/menuSeed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-time-ish admin action: replaces the live menus + events with the seeded
// defaults. DESTRUCTIVE — gated behind RESEED_SECRET. Disabled (403) unless that
// env var is set.
export async function POST(req: Request): Promise<Response> {
  const secret = process.env.RESEED_SECRET;
  if (!secret) {
    return new Response("Reseed disabled — set RESEED_SECRET to enable.", { status: 403 });
  }

  const provided =
    req.headers.get("x-reseed-secret") ?? new URL(req.url).searchParams.get("key");
  if (provided !== secret) {
    return new Response("Forbidden", { status: 401 });
  }

  const result = await reseed(prisma);
  revalidatePath("/");
  revalidatePath("/menus");
  revalidatePath("/events");

  return Response.json({ ok: true, ...result });
}
