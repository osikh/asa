import { NextRequest, NextResponse } from 'next/server';
import { auditWorkflow } from '@/mastra/workflows/audit-workflow';
import type { AppStoreListing } from '@/mastra/tools/itune-scraping-tool';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { listing }: { listing: AppStoreListing } = await req.json();
    if (!listing) return NextResponse.json({ ok: false, error: 'listing required' }, { status: 400 });

    const run = await auditWorkflow.createRun();
    const result = await run.start({ inputData: { listing } });

    if (result.status !== 'success') {
      const error = result.status === 'failed' ? String(result.error) : 'Workflow did not complete';
      return NextResponse.json({ ok: false, error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, result: result.result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
