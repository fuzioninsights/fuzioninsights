// Comunidade: petições, votações e publicações simples.
//  - LER (GET): público, só texto, em páginas pequenas e com cache de borda (poupa o Firebase).
//  - CRIAR: só assinante ativo (login Google/e-mail confirmado + ficha em /ativos).
//  - ASSINAR / VOTAR / CURTIR: qualquer conta com e-mail confirmado (1 por pessoa, garantido no servidor).
//  - EXCLUIR: o próprio autor ou o administrador.
// Tudo fica em /comunidade no Firebase e é gravado com a conta do administrador (as mesmas variáveis do /premium).
//
// REGRAS DO FIREBASE (Realtime Database > Regras): acrescente, ao lado de "premium":
//   "comunidade": { ".read": "auth != null && auth.token.email == 'SEU_EMAIL_ADMIN'", ".write": "auth != null && auth.token.email == 'SEU_EMAIL_ADMIN'" }
const DB = 'https://fuzion-insights-default-rtdb.firebaseio.com';
const KEY = process.env.FB_API_KEY || 'AIzaSyCwWE9YtckCT--utTkRJAqxk1_HWu0EJlM';
const TIPOS = ['peticao', 'votacao', 'post'];
const MAX_DIA = 3;                    // criações por pessoa por dia
const VOTAR_SO_ASSINANTE = false;     // true = só assinantes assinam/votam/curtem
const PAGINA = 12;

const H = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const out = (code, obj, extra) => ({ statusCode: code, headers: Object.assign({}, H, extra || {}), body: JSON.stringify(obj) });
const emailKey = e => String(e).trim().toLowerCase().replace(/[.#$\[\]\/]/g, ',');
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const one = (s, max) => clean(s, max).replace(/\s+/g, ' ');
const newId = () => Date.now().toString(36).padStart(9, '0') + Math.random().toString(36).slice(2, 5);

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

// leitura (GET) e escrita (PUT/PATCH/DELETE) em /comunidade, sempre com a conta do administrador
async function fbq(path, query) {
  const t = await adminToken();
  const r = await fetch(`${DB}/comunidade/${path}.json?${query}&auth=${t}`);
  if (r.status === 401 || r.status === 403) { const e = new Error('regras'); e.regras = true; throw e; }
  const d = await r.json().catch(() => null);
  if (d && d.error) throw new Error('consulta');
  return d;
}
async function fbw(path, method, body, headers) {
  const t = await adminToken();
  const r = await fetch(`${DB}/comunidade/${path}.json?auth=${t}`, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}), body: body === undefined ? undefined : JSON.stringify(body) });
  if (r.status === 401 || r.status === 403) { const e = new Error('regras'); e.regras = true; throw e; }
  const txt = await r.text(); let data = null; try { data = JSON.parse(txt); } catch (e) {}
  return { status: r.status, data };
}
const INC = { '.sv': { increment: 1 } };
const DEC = { '.sv': { increment: -1 } };

// confere o login (token do Firebase Auth) e devolve quem é
async function quem(token) {
  const u = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: String(token || '') })
  })).json().catch(() => ({}));
  const usr = u && u.users && u.users[0];
  if (!usr || !usr.email) return { erro: 'login' };
  if (!usr.emailVerified) return { erro: 'verificar' };
  const email = String(usr.email).toLowerCase();
  const adm = !!process.env.FB_ADMIN_EMAIL && email === String(process.env.FB_ADMIN_EMAIL).toLowerCase();
  return { uid: usr.localId, email, adm, nome: usr.displayName || '' };
}
async function assinante(email, adm) {
  if (adm) return true;
  const t = await adminToken();
  const rec = await (await fetch(`${DB}/ativos/${encodeURIComponent(emailKey(email))}.json?auth=${t}`)).json().catch(() => null);
  const hoje = new Date().toISOString().slice(0, 10);
  return !!(rec && !rec.error && String(rec.email || '').toLowerCase() === email && rec.ate && rec.ate >= hoje);
}
async function apelido(uid, fallback, email) {
  const p = await fbq(`perfis/${uid}`, 'x=1').catch(() => null);
  if (p && p.nome) return p.nome;
  const base = fallback || String(email || '').split('@')[0] || 'Assinante';
  return one(base, 30) || 'Assinante';
}

const pub = (tipo, id, it) => ({
  id, tipo, t: it.t, u: it.u, autor: it.autor || '', titulo: it.titulo || '', texto: it.texto || '',
  n: it.n || 0, meta: it.meta || 0, img: !!it.img, opcoes: it.opcoes ? Object.values(it.opcoes) : undefined,
  v: it.opcoes ? Object.keys(it.opcoes).map(k => (it.v && it.v[k]) || 0) : undefined, fim: it.fim || ''
});

exports.handler = async (event) => {
  if (!process.env.FB_ADMIN_EMAIL || !process.env.FB_ADMIN_PASSWORD) return out(503, { ok: false, erro: 'configuracao' });
  try {
    // ---------- LEITURA PÚBLICA (com cache de borda) ----------
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      const tipo = String(q.tipo || '');
      if (!TIPOS.includes(tipo)) return out(400, { ok: false, erro: 'tipo' });
      if (q.id) {                      // um item só (link compartilhado)
        const id = String(q.id);
        if (!/^[0-9a-z]{9,14}$/.test(id)) return out(400, { ok: false, erro: 'dados' });
        const it = await fbq(`${tipo}/${id}`, 'x=1');
        if (!it) return out(404, { ok: false, erro: 'nao_existe' });
        return out(200, { ok: true, item: pub(tipo, id, it) }, { 'cache-control': 'public, max-age=0, s-maxage=20, stale-while-revalidate=60' });
      }
      if (q.top) {                     // mais assinadas/votadas entre as 60 mais recentes (sem precisar de índice)
        const d = await fbq(tipo, `orderBy=${encodeURIComponent('"$key"')}&limitToLast=60`) || {};
        const lista = Object.keys(d).map(k => pub(tipo, k, d[k])).sort((a, b) => (b.n - a.n) || (b.t - a.t)).slice(0, 6);
        return out(200, { ok: true, itens: lista, mais: false }, { 'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=120' });
      }
      const antes = /^[0-9a-z]{9,14}$/.test(q.antes || '') ? q.antes : '';
      const lim = PAGINA + (antes ? 2 : 1);
      let query = `orderBy=${encodeURIComponent('"$key"')}&limitToLast=${lim}`;
      if (antes) query += `&endAt=${encodeURIComponent(JSON.stringify(antes))}`;
      const d = await fbq(tipo, query) || {};
      let ids = Object.keys(d).sort().reverse().filter(k => k !== antes);
      const mais = ids.length > PAGINA; ids = ids.slice(0, PAGINA);
      return out(200, { ok: true, itens: ids.map(k => pub(tipo, k, d[k])), mais }, { 'cache-control': 'public, max-age=0, s-maxage=20, stale-while-revalidate=60' });
    }
    if (event.httpMethod !== 'POST') return out(405, { ok: false, erro: 'metodo' });
    let b; try { b = JSON.parse(event.body || '{}'); } catch (e) { return out(400, { ok: false, erro: 'dados' }); }
    const me = await quem(b.token);
    if (me.erro) return out(me.erro === 'login' ? 401 : 403, { ok: false, erro: me.erro });
    const acao = String(b.acao || '');

    // ---------- MINHA ÁREA ----------
    if (acao === 'minha') {
      const [meus, criados, perfil, sub] = await Promise.all([
        fbq(`meus/${me.uid}`, 'x=1'), fbq(`porautor/${me.uid}`, 'x=1'), fbq(`perfis/${me.uid}`, 'x=1').catch(() => null), assinante(me.email, me.adm)
      ]);
      return out(200, { ok: true, assinante: sub, adm: me.adm, uid: me.uid, nome: (perfil && perfil.nome) || '', meus: meus || {}, criados: criados || {} });
    }
    if (acao === 'perfil') {
      const nome = one(b.nome, 30);
      if (nome.length < 3) return out(400, { ok: false, erro: 'nome' });
      await fbw(`perfis/${me.uid}`, 'PUT', { nome });
      return out(200, { ok: true, nome });
    }

    // ---------- CRIAR ----------
    if (acao === 'criar') {
      const tipo = String(b.tipo || '');
      if (!TIPOS.includes(tipo)) return out(400, { ok: false, erro: 'tipo' });
      if (!(await assinante(me.email, me.adm))) return out(403, { ok: false, erro: 'sem_assinatura' });
      const dia = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      if (!me.adm) {
        const usados = await fbq(`limite/${me.uid}/${dia}`, 'x=1');
        if ((usados || 0) >= MAX_DIA) return out(429, { ok: false, erro: 'limite' });
      }
      const it = { t: Date.now(), u: me.uid, autor: await apelido(me.uid, me.nome, me.email), n: 0 };
      if (tipo === 'post') {
        it.texto = clean(b.texto, 600);
        if (it.texto.length < 5) return out(400, { ok: false, erro: 'curto' });
      } else {
        it.titulo = one(b.titulo, 120);
        it.texto = clean(b.texto, tipo === 'peticao' ? 1500 : 400);
        if (it.titulo.length < 8) return out(400, { ok: false, erro: 'curto' });
        if (tipo === 'peticao') {
          if (it.texto.length < 30) return out(400, { ok: false, erro: 'curto' });
          it.meta = Math.min(100000, Math.max(10, parseInt(b.meta, 10) || 100));
        } else {
          const ops = (Array.isArray(b.opcoes) ? b.opcoes : []).map(o => one(o, 60)).filter(Boolean).slice(0, 6);
          if (ops.length < 2) return out(400, { ok: false, erro: 'opcoes' });
          it.opcoes = ops; it.v = ops.map(() => 0);
          const dias = Math.min(30, Math.max(1, parseInt(b.dias, 10) || 7));
          it.fim = new Date(Date.now() + dias * 864e5).toISOString().slice(0, 10);
        }
      }
      const id = newId();
      // imagem opcional (JPEG já reduzido pelo navegador, até ~190 KB); fica em /imagens para não pesar nas listas
      let foto = '';
      if (b.img) {
        foto = String(b.img);
        if (!/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(foto) || foto.length > 260000) return out(400, { ok: false, erro: 'imagem' });
        it.img = 1;
      }
      if (foto) await fbw(`imagens/${id}`, 'PUT', foto);
      await fbw(`${tipo}/${id}`, 'PUT', it);
      await fbw(`porautor/${me.uid}/${id}`, 'PUT', { tp: tipo, ti: (it.titulo || it.texto).slice(0, 80), t: it.t });
      if (!me.adm) await fbw(`limite/${me.uid}`, 'PUT', { [dia]: ((await fbq(`limite/${me.uid}/${dia}`, 'x=1')) || 0) + 1 });
      return out(200, { ok: true, item: pub(tipo, id, it) });
    }

    // ---------- ASSINAR / VOTAR / CURTIR ----------
    if (acao === 'votar') {
      const tipo = String(b.tipo || ''), id = String(b.id || '');
      if (!TIPOS.includes(tipo) || !/^[0-9a-z]{9,14}$/.test(id)) return out(400, { ok: false, erro: 'dados' });
      if (VOTAR_SO_ASSINANTE && !(await assinante(me.email, me.adm))) return out(403, { ok: false, erro: 'sem_assinatura' });
      const it = await fbq(`${tipo}/${id}`, 'x=1');
      if (!it) return out(404, { ok: false, erro: 'nao_existe' });
      let op = 0;
      if (tipo === 'votacao') {
        op = parseInt(b.op, 10);
        if (!(op >= 0 && it.opcoes && op < Object.keys(it.opcoes).length)) return out(400, { ok: false, erro: 'opcao' });
        if (it.fim && it.fim < new Date().toISOString().slice(0, 10)) return out(409, { ok: false, erro: 'encerrada' });
      }
      // garante 1 por pessoa: só grava se ainda não existir
      const r = await fbw(`meus/${me.uid}/${id}`, 'PUT', { tp: tipo, v: op, ti: (it.titulo || it.texto || '').slice(0, 80), t: Date.now() }, { 'if-match': 'null_etag' });
      if (r.status === 412) return out(409, { ok: false, erro: 'ja_votou' });
      if (r.status >= 300) return out(500, { ok: false, erro: 'servidor' });
      await fbw(`${tipo}/${id}`, 'PATCH', tipo === 'votacao' ? { n: INC, [`v/${op}`]: INC } : { n: INC });
      return out(200, { ok: true });
    }
    if (acao === 'desfazer') {            // tira a assinatura/curtida (votação não pode ser desfeita)
      const tipo = String(b.tipo || ''), id = String(b.id || '');
      if (!['peticao', 'post'].includes(tipo) || !/^[0-9a-z]{9,14}$/.test(id)) return out(400, { ok: false, erro: 'dados' });
      const r = await fbw(`meus/${me.uid}/${id}`, 'GET');
      if (!r.data) return out(200, { ok: true });
      await fbw(`meus/${me.uid}/${id}`, 'DELETE');
      await fbw(`${tipo}/${id}`, 'PATCH', { n: DEC });
      return out(200, { ok: true });
    }

    // ---------- EXCLUIR ----------
    if (acao === 'excluir') {
      const tipo = String(b.tipo || ''), id = String(b.id || '');
      if (!TIPOS.includes(tipo) || !/^[0-9a-z]{9,14}$/.test(id)) return out(400, { ok: false, erro: 'dados' });
      const it = await fbq(`${tipo}/${id}`, 'x=1');
      if (!it) return out(200, { ok: true });
      if (!me.adm && it.u !== me.uid) return out(403, { ok: false, erro: 'proibido' });
      await fbw(`${tipo}/${id}`, 'DELETE');
      if (it.img) await fbw(`imagens/${id}`, 'DELETE');
      if (it.u) await fbw(`porautor/${it.u}/${id}`, 'DELETE');
      return out(200, { ok: true });
    }
    return out(400, { ok: false, erro: 'acao' });
  } catch (e) {
    cache = { t: '', exp: 0 };
    return out(e && e.regras ? 503 : 500, { ok: false, erro: e && e.regras ? 'regras' : 'servidor' });
  }
};
