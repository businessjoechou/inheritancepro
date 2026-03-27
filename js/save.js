// save.js — calculation history module
import { supabase } from './auth.js';

export async function saveCalculation({ tool, title, summary, data }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '請先登入' };
  const { error } = await supabase.from('calculations').insert({
    user_id: user.id, tool, title, summary, data
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
