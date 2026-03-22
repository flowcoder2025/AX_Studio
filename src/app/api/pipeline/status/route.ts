import { NextRequest } from 'next/server';
import { getPipelineStatus } from '@/lib/pipeline/engine';

export async function GET(req: NextRequest) {
  const pipelineId = req.nextUrl.searchParams.get('id');

  if (!pipelineId) {
    return new Response(JSON.stringify({ error: 'id parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        if (closed) { clearInterval(interval); return; }

        const status = getPipelineStatus(pipelineId);

        if (!status) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Pipeline not found' })}\n\n`));
          clearInterval(interval);
          try { controller.close(); } catch {}
          closed = true;
          return;
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          id: pipelineId,
          status: status.status,
          progress: status.progress,
          currentStep: status.step,
        })}\n\n`));

        if (status.status === 'complete' || status.status === 'error') {
          clearInterval(interval);
          try { controller.close(); } catch {}
          closed = true;
        }
      }, 500);

      // Timeout after 10 minutes
      setTimeout(() => {
        if (!closed) {
          clearInterval(interval);
          try { controller.close(); } catch {}
          closed = true;
        }
      }, 600000);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
