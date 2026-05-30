import { NextResponse } from 'next/server';
import { join } from 'path';
import { loadAllAgents, getAllAgentsList } from '@/api/agentLoader';

export async function GET() {
  try {
    // Load agents from parent directory
    loadAllAgents(join(process.cwd(), '../agents'));
    const agents = getAllAgentsList();
    return NextResponse.json({ agents });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
