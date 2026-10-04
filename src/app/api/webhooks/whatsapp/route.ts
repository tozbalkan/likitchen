import type { NextRequest, NextResponse } from 'next/server';
import { handleWebhookGet, handleWebhookPost } from './handlers';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleWebhookGet(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleWebhookPost(request);
}
