import { NextRequest, NextResponse } from 'next/server';

// OAuth callback is no longer needed — Claude CLI handles auth via Max subscription.
// This route redirects to the dashboard.
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/', req.url));
}
