// Área do assinante: confere e-mail + código de acesso e entrega a parte exclusiva dos artigos.
// O texto exclusivo fica em /premium/<id> no Firebase, com leitura liberada SÓ para a conta do administrador.
// Esta função entra com essa conta (variáveis de ambiente) e devolve o texto apenas a quem tem acesso ativo.
//
// Variáveis no Netlify (Site configuration > Environment variables):
//   FB_ADMIN_EMAIL     e-mail da conta administradora do Firebase (a mesma do painel)
//   FB_ADMIN_PASSWORD  senha dessa conta
//   FB_API_KEY         (opcional) chave web do Firebase; por padrão usa a do site
const DB = 'https://fuzion-insights-default-rtdb.firebaseio.com';
const KEY = process.env.FB_API_KEY || 'AIzaSyCwWE9YtckCT--utTkRJAqxk1_HWu0EJlM';
const H = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const out = (code, obj) => ({ statusCode: code, headers: H, body: JSON.stringify(obj) });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// mesma regra do painel: uma ficha por e-mail em /ativos
const emailKey = e => String(e).trim().toLowerCase().replace(/[.#$\[\]\/]/g, ',');

let cache = { t: '', exp: 0 };
async function adminToken() {
  if (cache.t && Date.now() < cache.exp) return cache.t;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.FB_ADMIN_EMAIL, password: process.env.FB_ADMIN_PASSWORD, returnSecureToken: true })
  });
  const d = await r.json();
  if (!d.idToken) throw new Error('auth');
  cache = { t: d.idToken, exp: Date.now() + 50 * 60 * 1000 };
  return d.idToken;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return out(405, { ok: false, erro: 'metodo' });
  let b; try { b = JSON.parse(event.body || '{}'); } catch (e) { return out(400, { ok: false, erro: 'dados' }); }
  const email = String(b.email || '').trim().toLowerCase();
  const codigo = String(b.codigo || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const id = String(b.id || '').trim();
  if (!email || !codigo || email.length > 200) return out(400, { ok: false, erro: 'dados' });
  if (!process.env.FB_ADMIN_EMAIL || !process.env.FB_ADMIN_PASSWORD) return out(503, { ok: false, erro: 'configuracao' });

  try {
    const t = await adminToken();
    const rec = await (await fetch(`${DB}/ativos/${encodeURIComponent(emailKey(email))}.json?auth=${t}`)).json();
    const hoje = new Date().toISOString().slice(0, 10);
    const ok = rec && !rec.error && String(rec.email || '').toLowerCase() === email &&
      String(rec.codigo || '').toUpperCase() === codigo && rec.ate && rec.ate >= hoje;
    if (!ok) { await sleep(700); return out(401, { ok: false, erro: rec && rec.ate && rec.ate < hoje && String(rec.codigo || '').toUpperCase() === codigo ? 'expirado' : 'invalido' }); }

    const res = { ok: true, plano: rec.plano || '', ate: rec.ate };
    if (id) {
      const c = await (await fetch(`${DB}/premium/${encodeURIComponent(id)}.json?auth=${t}`)).json();
      res.html = typeof c === 'string' ? c : '';
    }
    // download de arquivo anexado ao artigo (só quem tem acesso ativo chega aqui)
    const arq = String(b.arquivo || '').trim();
    if (id && arq) {
      const f = await (await fetch(`${DB}/arquivos/${encodeURIComponent(id)}/${encodeURIComponent(arq)}.json?auth=${t}`)).json();
      if (!f || f.error || !f.data) return out(404, { ok: false, erro: 'arquivo' });
      res.arquivo = { nome: f.nome, tipo: f.tipo || 'application/octet-stream', data: f.data };
    }
    return out(200, res);
  } catch (e) {
    cache = { t: '', exp: 0 };
    return out(500, { ok: false, erro: 'servidor' });
  }
};
