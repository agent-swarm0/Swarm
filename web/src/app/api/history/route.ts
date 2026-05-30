import { NextRequest } from 'next/server';
import { listProjectsHistory } from '@/api/history';

export async function GET(req: NextRequest) {
  try {
    const history = listProjectsHistory();
    return new Response(JSON.stringify({ history }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
