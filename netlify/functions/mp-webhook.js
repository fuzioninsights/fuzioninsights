// Recebe o aviso do Mercado Pago, confere o pagamento na API deles e ATIVA/RENOVA a assinatura em /ativos (por e-mail).
// Nunca confia no corpo do aviso: sempre consulta o pagamento com o seu Access Token.
// Configure no Mercado Pago (Suas integrações > Webhooks) o evento "Pagamentos" apontando para  https://SEU-SITE/api/mp
// (a própria função /api/checkout já envia essa URL em cada pagamento).
const MPT = process.env.MP_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN;   // aceita os dois nomes de variável
const DB = 'https://fuzion-insights-default-rtdb.firebaseio.com';
const KEY = process.env.FB_API_KEY || 'AIzaSyCwWE9YtckCT--utTkRJAqxk1_HWu0EJlM';
const ok = (obj) => ({ statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(obj || { ok: true }) });
const emailKey = e => String(e).trim().toLowerCase().replace(/[.#$\[\]\/]/g, ',');
const PLANOS = () => ({ mensal: { dias: 31, preco: Number(process.env.PRECO_MENSAL) || 11 }, anual: { dias: 366, preco: Number(process.env.PRECO_ANUAL) || 114 } });
const makeCode = () => Array.from(require('crypto').randomBytes(8), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
const iso = d => d.toISOString().slice(0, 10);

let cache = { t: '', exp: 0 };
async function adminToken() {
  if (cache.t && Date.now() < cache.exp) return cache.t;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.FB_ADMIN_EMAIL, password: process.env.FB_ADMIN_PASSWORD, returnSecureToken: true })
  });
  const d = await r.json(); if (!d.idToken) throw new Error('auth');
  cache = { t: d.idToken, exp: Date.now() + 50 * 60 * 1000 }; return d.idToken;
}

exports.handler = async (event) => {
  if (!MPT || !process.env.FB_ADMIN_EMAIL || !process.env.FB_ADMIN_PASSWORD) return ok({ ok: false, erro: 'configuracao' });
  const q = event.queryStringParameters || {};
  let id = q['data.id'] || q.id, type = q.type || q.topic;
  try { const b = JSON.parse(event.body || '{}'); id = id || (b.data && b.data.id) || b.id; type = type || b.type || b.topic; } catch (e) {}
  if ((type && type !== 'payment') || !id || !/^\d+$/.test(String(id))) return ok({ ok: true, ignorado: true });
  try {
    const p = await (await fetch(`https://api.mercadopago.com/v1/payments/${id}`, { headers: { Authorization: `Bearer ${MPT}` } })).json();
    if (!p || p.status !== 'approved') return ok({ ok: true, status: p && p.status });
    const [email0, plano] = String(p.external_reference || '').split('|'), pl = PLANOS()[plano], email = String(email0 || '').trim().toLowerCase();
    if (!pl || !email || Number(p.transaction_amount) + 0.001 < pl.preco) return ok({ ok: true, ignorado: 'dados' });
    const t = await adminToken(), url = `${DB}/ativos/${encodeURIComponent(emailKey(email))}.json?auth=${t}`;
    const cur = await (await fetch(url)).json().catch(() => null);
    if (cur && !cur.error && String(cur.mp || '') === String(id)) return ok({ ok: true, repetido: true });      // aviso repetido
    const hoje = new Date(), base = cur && !cur.error && cur.ate && cur.ate > iso(hoje) ? new Date(cur.ate + 'T12:00:00Z') : hoje;
    base.setUTCDate(base.getUTCDate() + pl.dias);
    await fetch(url, { method: 'PATCH', body: JSON.stringify({ email, plano, ate: iso(base), codigo: (cur && cur.codigo) || makeCode(), status: 'ativo', mp: String(id), atualizado: new Date().toISOString() }) });
    return ok({ ok: true, ativado: email, ate: iso(base) });
  } catch (e) { cache = { t: '', exp: 0 }; return { statusCode: 500, body: 'erro' }; }     // 500 faz o Mercado Pago tentar de novo
};
