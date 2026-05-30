import { NextRequest } from 'next/server';
import { restoreProjectFromHistory } from '@/api/history';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    restoreProjectFromHistory(sessionId);
    return new Response(JSON.stringify({ success: true, message: `Successfully restored project session ${sessionId}` }), {
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
