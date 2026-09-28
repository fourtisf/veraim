import { NextResponse } from "next/server";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
export const readJson = async (req: Request) => (await req.json().catch(() => null)) ?? {};
