// save.js — calculation history module
import { supabase, getProfile } from './auth.js';

export async function saveCalculation({ tool, title, summary, data }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '請先登入' };

  // Get Pro status from DB — do NOT trust localStorage to prevent bypass
  const profile = await getProfile();

  const enrichedData = {
    ...data,
    _persona:  profile?.pro_tier || 'public',
    _is_pro:   profile?.is_pro   || false,
  };
  const { error } = await supabase.from('calculations').insert({
    user_id: user.id, tool, title, summary, data: enrichedData
  });
  return error ? { error: error.message } : { success: true };
}

export async function getCalculations() {
  const { data, error } = await supabase
    .from('calculations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  return error ? [] : (data || []);
}

export async function deleteCalculation(id) {
  const { error } = await supabase.from('calculations').delete().eq('id', id);
  return !error;
}
