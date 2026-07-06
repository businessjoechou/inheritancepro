// ChouLegal central account data storage for InheritancePro.
import { ensureChouLegalAccount, supabase } from './auth.js';

const PRODUCT_KEY = 'people';
const SOURCE_APP = 'inheritancepro';

function normalizeRow(row) {
  const payload = row.payload || {};
  return {
    id: row.id,
    tool: payload.tool || row.source || SOURCE_APP,
    title: row.title,
    summary: row.summary,
    data: payload.data || payload,
    created_at: row.created_at,
    updated_at: row.updated_at,
    product_key: row.product_key,
    source_app: payload.source_app || SOURCE_APP
  };
}

export async function saveCalculation({ tool, title, summary, data }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '請先登入' };

  const accountId = await ensureChouLegalAccount(PRODUCT_KEY);
  if (!accountId) return { error: '無法建立周全帳號，請重新登入後再試' };

  const { error } = await supabase.from('choulegal_account_data').insert({
    account_id: accountId,
    product_key: PRODUCT_KEY,
    data_type: 'calculation',
    source: tool || SOURCE_APP,
    title: title || '未命名紀錄',
    summary: summary || '',
    payload: {
      source_app: SOURCE_APP,
      tool,
      data
    }
  });
  return error ? { error: error.message } : { success: true };
}

export async function getCalculations() {
  await ensureChouLegalAccount(PRODUCT_KEY);
  const { data, error } = await supabase
    .from('choulegal_account_data')
    .select('*')
    .eq('product_key', PRODUCT_KEY)
    .eq('data_type', 'calculation')
    .is('deleted_at', null)
    .eq('payload->>source_app', SOURCE_APP)
    .order('updated_at', { ascending: false })
    .limit(50);
  return error ? [] : (data || []).map(normalizeRow);
}

export async function deleteCalculation(id) {
  const { error } = await supabase
    .from('choulegal_account_data')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}
