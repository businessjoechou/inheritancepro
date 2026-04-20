// auth.js — Supabase Auth helper module
// @ts-ignore — CDN ESM import; types not available in this browser-only build
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
// registerPlugin loaded dynamically only when needed (Capacitor native)

export const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'implicit'
  }
});

// Get current user
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Get user profile
export async function getProfile() {
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return data || null;
}

// Sign in with Apple
export async function signInWithApple() {
  // In Capacitor native app: use native Apple Sign In
  if (window.Capacitor?.isNativePlatform()) {
    // @ts-ignore — CDN ESM import; loaded lazily only in Capacitor native
    const { registerPlugin } = await import('https://cdn.jsdelivr.net/npm/@capacitor/core@8/+esm');
    const AppleSignIn = registerPlugin('AppleSignIn');
    const result = await AppleSignIn.signIn();

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: result.identityToken,
      nonce: result.nonce
    });

    if (!error) {
      window.location.href = '/account.html';
    } else {
      throw new Error(error.message);
    }
    return;
  }

  // Web: OAuth redirect
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: window.location.origin + '/account.html' }
  });
  
  if (error) {
    throw error;
  }
}

// Sign in with magic link (email OTP)
export async function signInWithEmail(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + '/account.html' }
  });
  return error;
}

// Sign out
export async function signOut() {
  // 登出時立即清除所有 localStorage 草稿（敏感計算資料），避免殘留在共用裝置
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('ip_draft_')) localStorage.removeItem(k);
    }
  } catch (_) {}
  await supabase.auth.signOut();
  window.location.reload();
}

// Redeem a Pro activation code
// Uses security definer RPC to prevent direct table access and race conditions
export async function redeemCode(code) {
  const user = await getUser();
  if (!user) return { error: '請先登入' };

  const { data, error } = await supabase.rpc('redeem_code', {
    p_code: code.toUpperCase().trim()
  });

  if (error) return { error: '兌換失敗，請稍後再試' };
  if (data?.error) return { error: data.error };
  return { success: true, tier: data.tier };
}
