import type { NextRequest, NextResponse } from 'next/server';
import { handleGet, handlePost } from './handlers';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleGet(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handlePost(request);
}
