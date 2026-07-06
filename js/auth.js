// ChouLegal account helper for static public tools.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const PRODUCT_KEY = 'people';

export const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'implicit',
    persistSession: true,
    autoRefreshToken: true
  }
});

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function ensureChouLegalAccount(productKey = PRODUCT_KEY) {
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc('ensure_choulegal_account', {
    p_product_key: productKey
  });
  if (error) {
    console.error('ensure_choulegal_account failed:', error);
    return user.id;
  }
  return data || user.id;
}

export async function getProfile() {
  const user = await getUser();
  if (!user) return null;

  await ensureChouLegalAccount();
  const { data, error } = await supabase
    .from('choulegal_accounts')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('getProfile failed:', error);
    return null;
  }
  return data || {
    id: user.id,
    email: user.email,
    display_name: user.user_metadata?.name || user.email?.split('@')[0] || null,
    created_at: user.created_at
  };
}

export async function signInWithApple() {
  if (window.Capacitor?.isNativePlatform()) {
    const { registerPlugin } = await import('https://cdn.jsdelivr.net/npm/@capacitor/core@8/+esm');
    const AppleSignIn = registerPlugin('AppleSignIn');
    const result = await AppleSignIn.signIn();

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: result.identityToken,
      nonce: result.nonce
    });

    if (error) throw new Error(error.message);
    await ensureChouLegalAccount();
    window.location.href = '/account.html';
    return;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: window.location.origin + '/account.html' }
  });
  if (error) throw error;
}

export async function signInWithEmail(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + '/account.html' }
  });
  return error;
}

export async function signOut() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('ip_draft_') || key.startsWith('choulegal_draft_'))) {
        localStorage.removeItem(key);
      }
    }
  } catch (_) {}
  await supabase.auth.signOut();
  window.location.reload();
}

export async function redeemCode(code) {
  const user = await getUser();
  if (!user) return { error: '請先登入' };

  await ensureChouLegalAccount();
  const { data, error } = await supabase.rpc('redeem_code', {
    p_code: code.toUpperCase().trim()
  });

  if (error) return { error: '兌換功能尚未啟用，請稍後再試' };
  if (data?.error) return { error: data.error };
  return { success: true, tier: data?.tier || 'pro' };
}
