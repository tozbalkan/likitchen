import { NextResponse, type NextRequest } from 'next/server';

export interface LeadDto {
  id: string;
  customerName: string;
  phone: string;
  projectType: string;
  location: string;
  budget: string;
  score: number;
  readiness: string;
  humanTakeover: boolean;
}

// Global server-side lead store for live dashboard persistence
const LIVE_LEADS_STORE = new Map<string, LeadDto>([
  [
    'lead-101',
    {
      id: 'lead-101',
      customerName: 'Sarah Jenkins',
      phone: '+1 (555) 234-5678',
      projectType: 'Full Kitchen Remodel',
      location: 'Nassau County, NY',
      budget: '$40,000 – $60,000',
      score: 88,
      readiness: 'READY_FOR_HANDOFF',
      humanTakeover: false,
    },
  ],
  [
    'lead-102',
    {
      id: 'lead-102',
      customerName: 'Michael Chang',
      phone: '+1 (555) 876-5432',
      projectType: 'Master Bathroom Remodel',
      location: 'Brooklyn, NY',
      budget: '$25,000 – $35,000',
      score: 92,
      readiness: 'READY_FOR_HANDOFF',
      humanTakeover: true,
    },
  ],
]);

export async function GET(): Promise<NextResponse> {
  const leads = Array.from(LIVE_LEADS_STORE.values());
  return NextResponse.json({ leads }, { status: 200 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      leadId?: string;
      humanTakeover?: boolean;
    };
    if (!body.leadId || typeof body.humanTakeover !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const existing = LIVE_LEADS_STORE.get(body.leadId);
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const updated: LeadDto = {
      ...existing,
      humanTakeover: body.humanTakeover,
    };
    LIVE_LEADS_STORE.set(body.leadId, updated);

    return NextResponse.json({ success: true, lead: updated }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
