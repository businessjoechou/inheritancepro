// Vercel Serverless Function: send newsletter to all active subscribers
// Call with POST + Authorization header (secret key)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Simple auth check
  const authKey = req.headers['x-api-key'];
  if (authKey !== process.env.NEWSLETTER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { subject, html } = req.body;
  if (!subject || !html) {
    return res.status(400).json({ error: 'Missing subject or html' });
  }

  try {
    // Get all active subscribers
    const { data: subscribers, error: fetchErr } = await supabase
      .from('subscribers')
      .select('email, name')
      .eq('is_active', true);

    if (fetchErr) throw fetchErr;
    if (!subscribers?.length) {
      return res.status(200).json({ sent: 0, message: 'No active subscribers' });
    }

    // Send via Resend API
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
    }

    let sent = 0;
    let failed = 0;
    const errors = [];

    // Send in batches of 2 (Resend free tier: 2 req/sec)
    for (let i = 0; i < subscribers.length; i += 2) {
      if (i > 0) await new Promise(r => setTimeout(r, 1100)); // 1.1s delay between batches
      const batch = subscribers.slice(i, i + 2);
      const promises = batch.map(sub =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'InheritancePro <notify@inheritancepro.app>',
            to: sub.email,
            reply_to: 'businessjoechou@gmail.com',
            subject: subject,
            html: html.replace('{{name}}', sub.name || '用戶')
          })
        }).then(async r => {
          if (r.ok) { sent++; }
          else {
            failed++;
            const body = await r.text().catch(() => '');
            errors.push({ email: sub.email, status: r.status, error: body });
          }
        }).catch(err => {
          failed++;
          errors.push({ email: sub.email, error: err.message });
        })
      );
      await Promise.all(promises);
    }

    return res.status(200).json({ sent, failed, total: subscribers.length, errors });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
