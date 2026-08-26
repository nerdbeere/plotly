import { NextResponse } from "next/server";
import { completeTaskWithReward } from "@/lib/gamification/engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const result = await completeTaskWithReward(taskId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
