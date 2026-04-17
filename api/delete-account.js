// Vercel Serverless Function: delete user account (auth.users + profiles + calculations)
// 取代 account.html 前端的刪除邏輯：前端 anon key 無權刪 auth.users row，
// 只能透過 server-side 的 service key + supabase.auth.admin.deleteUser() 實刪。
// DB schema 已設 ON DELETE CASCADE（profiles/calculations 參照 auth.users），
// 所以顯式刪業務表是 no-op，但保留以備 schema 變動（且能取 error log）。

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. 讀 bearer token（絕不信任 body 傳的 userId，必須從 token 反推）
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authorization token' });

  // 2. 驗證 token → 取得 user.id
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    console.error('[delete-account] auth failed:', authError?.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  const userId = user.id;

  try {
    // 3. 顯式刪業務表（CASCADE 存在時是 no-op，安全）
    const { error: calcErr } = await supabase
      .from('calculations').delete().eq('user_id', userId);
    if (calcErr) throw new Error(`calculations: ${calcErr.message}`);

    const { error: profErr } = await supabase
      .from('profiles').delete().eq('id', userId);
    if (profErr) throw new Error(`profiles: ${profErr.message}`);

    // 4. 刪 auth.users（需 service_role key）
    const { error: authDelErr } = await supabase.auth.admin.deleteUser(userId);
    if (authDelErr) throw new Error(`auth.users: ${authDelErr.message}`);

    console.log(`[delete-account] success userId=${userId}`);
    return res.status(200).json({ success: true });
  } catch (e) {
    // 不 leak 內部細節，但 log 完整訊息給 Vercel function log
    console.error(`[delete-account] failed userId=${userId}:`, e.message);
    return res.status(500).json({ error: 'Failed to delete account. Please contact support.' });
  }
}
