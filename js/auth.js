// auth.js — Supabase Auth helper module
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

// Get user profile (includes is_pro), with expiration check
export async function getProfile() {
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (!data) return null;

  // Check if subscription has expired (lifetime = no expiry date)
  if (data.is_pro && data.pro_expires_at) {
    const expired = new Date(data.pro_expires_at) < new Date();
    if (expired) {
      // Revoke Pro in DB and return as free user
      await supabase.from('profiles')
        .update({ is_pro: false })
        .eq('id', user.id);
      localStorage.setItem('ip_persona', 'public');
      return { ...data, is_pro: false };
    }
  }
  return data;
}

// Sign in with Apple
export async function signInWithApple() {
  // In Capacitor native app: use native Apple Sign In
  if (window.Capacitor?.isNativePlatform()) {
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
  await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: window.location.origin + '/account.html' }
  });
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
  await supabase.auth.signOut();
  window.location.reload();
}

// Redeem a Pro activation code
export async function redeemCode(code) {
  const user = await getUser();
  if (!user) return { error: '請先登入' };

  // Check code exists and is unused
  const { data: codeData, error: fetchError } = await supabase
    .from('redemption_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_used', false)
    .single();

  if (fetchError || !codeData) return { error: '序號無效或已使用' };

  // Mark code as used
  const { error: updateError } = await supabase
    .from('redemption_codes')
    .update({
      is_used: true,
      used_by: user.id,
      used_at: new Date().toISOString()
    })
    .eq('id', codeData.id);

  if (updateError) return { error: '兌換失敗，請稍後再試' };

  // Upgrade user to Pro
  await supabase
    .from('profiles')
    .update({
      is_pro: true,
      pro_tier: codeData.tier,
      pro_expires_at: null,
      activated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  return { success: true, tier: codeData.tier };
}
