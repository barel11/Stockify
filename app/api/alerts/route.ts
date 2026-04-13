import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { symbol, targetPrice, direction } = body;

  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  if (targetPrice === undefined || targetPrice === null || isNaN(Number(targetPrice))) {
    return NextResponse.json({ error: "Missing or invalid targetPrice" }, { status: 400 });
  }
  if (!direction || !["above", "below"].includes(direction)) {
    return NextResponse.json({ error: "direction must be 'above' or 'below'" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("alerts")
    .insert({
      user_id: userId,
      symbol,
      target_price: Number(targetPrice),
      direction,
      triggered: false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabase();
  const { error } = await supabase
    .from("alerts")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
