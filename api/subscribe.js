// Vercel Serverless Function: handle newsletter subscriptions
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: '請輸入有效的電子信箱' });
  }

  try {
    const { error } = await supabase
      .from('subscribers')
      .upsert({ email: email.toLowerCase().trim(), name: name || null }, { onConflict: 'email' });

    if (error) throw error;

    return res.status(200).json({ success: true, message: '訂閱成功！' });
  } catch (err) {
    return res.status(500).json({ error: '訂閱失敗，請稍後再試' });
  }
}
