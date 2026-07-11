import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, subject, details, email, module } = body;

    if (!subject?.trim() || !details?.trim()) {
      return NextResponse.json({ error: 'Subject and details are required.' }, { status: 400 });
    }

    const entry = {
      id: `fb-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type:    type    || 'general',
      subject: subject.trim(),
      details: details.trim(),
      email:   email?.trim() || 'anonymous',
      module:  module  || 'General',
      origin:  req.headers.get('referer') || 'direct',
      ua:      req.headers.get('user-agent')?.slice(0, 120) || '',
    };

    // ── Log to server console (shows up in Vercel logs) ──────────────────
    console.log('[LAWS-SIM FEEDBACK]', JSON.stringify(entry, null, 2));

    // ── Discord Webhook (optional — set DISCORD_FEEDBACK_WEBHOOK in env) ──
    const webhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK;
    if (webhookUrl) {
      try {
        const color = type === 'bug' ? 0xff1a2e : type === 'feature' ? 0x0096ff : type === 'advocacy' ? 0x00d47e : 0xffaa00;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title:       `💡 [LAWS-SIM] ${type?.toUpperCase()} — ${subject.trim().slice(0, 80)}`,
              description: details.trim().slice(0, 1800),
              color,
              fields: [
                { name: 'Module',    value: module  || 'General', inline: true },
                { name: 'Reporter',  value: email?.trim() || 'Anonymous', inline: true },
                { name: 'Type',      value: type    || 'general',  inline: true },
              ],
              footer: { text: `LAWS-SIM Feedback Engine · ${entry.id}` },
              timestamp: entry.timestamp,
            }],
          }),
        });
      } catch (hookErr) {
        console.warn('[LAWS-SIM FEEDBACK] Discord webhook failed:', hookErr);
        // Non-fatal — feedback is already logged above
      }
    }

    return NextResponse.json({ success: true, id: entry.id }, { status: 200 });

  } catch (err) {
    console.error('[LAWS-SIM FEEDBACK] API error:', err);
    return NextResponse.json({ error: 'Internal error. Please try again.' }, { status: 500 });
  }
}
