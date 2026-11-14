// Contador de visitas próprio (sem serviço externo).
//  - Cada página manda 1 aviso minúsculo (POST /api/visita). Aqui só se guardam NÚMEROS agregados por dia.
//  - O IP nunca é gravado: ele vira (junto com o navegador) um código diário embaralhado (hash) só para contar
//    visitantes únicos e barrar abuso. Esses códigos são apagados depois de 2 dias.
//  - Robôs conhecidos (Google, Bing, redes sociais, monitores) são ignorados, para os números refletirem pessoas.
// Tudo fica em /stats no Firebase e é gravado com a conta do administrador (as mesmas variáveis do /premium).
//
// REGRAS DO FIREBASE (Realtime Database > Regras): acrescente, ao lado de "premium" e "comunidade":
//   "stats": { ".read": "auth != null && auth.token.email == 'SEU_EMAIL_ADMIN'", ".write": "auth != null && auth.token.email == 'SEU_EMAIL_ADMIN'" }
const crypto = require('crypto');
const DB = 'https://fuzion-insights-default-rtdb.firebaseio.com';
const KEY = process.env.FB_API_KEY || 'AIzaSyCwWE9YtckCT--utTkRJAqxk1_HWu0EJlM';
const SALT = process.env.STATS_SALT || KEY;
const MAX_POR_DIA = 400; // views por visitante/dia (acima disso é robô ou abuso)
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|headless|lighthouse|pagespeed|gtmetrix|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|java\/|feedfetcher|mediapartners|adsbot|google-read-aloud|chrome-lighthouse|bingpreview|ahrefs|semrush|mj12|dotbot/i;
const ok = () => ({ statusCode: 204, headers: { 'cache-control': 'no-store' } });
const INC = { '.sv': { increment: 1 } };

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

const brDay = ms => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const pkey = p => String(p || '/').split('#')[0].replace(/\/+$/, '').replace(/^$/, '/').slice(0, 90).replace(/\//g, '~').replace(/\./g, '^').replace(/[$\[\]#\u0000-\u001F\u007F]/g, '');
const GRUPOS = [
  ['busca', /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|yandex|brave|startpage)\./],
  ['instagram', /(^|\.)instagram\.com$|^l\.instagram\.com$/], ['facebook', /(^|\.)(facebook|fb)\.com$|^l\.facebook\.com$|^lm\.facebook\.com$/],
  ['x', /(^|\.)(twitter\.com|x\.com|t\.co)$/], ['linkedin', /(^|\.)(linkedin\.com|lnkd\.in)$/], ['whatsapp', /(^|\.)(whatsapp\.com|wa\.me)$/],
  ['telegram', /(^|\.)(telegram\.org|t\.me)$/], ['youtube', /(^|\.)(youtube\.com|youtu\.be)$/], ['reddit', /(^|\.)reddit\.com$/]
];
const grupo = h => { h = String(h || '').toLowerCase(); for (const [g, re] of GRUPOS) if (re.test(h)) return g; return 'outros'; };

async function fb(method, path, body, t) {
  const r = await fetch(`${DB}/${path}.json?auth=${t}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return r.ok ? r.json().catch(() => null) : null;
}
// faixas do Google (bom / precisa melhorar / ruim)
const faixa = (v, bom, ruim) => v <= bom ? 'g' : (v <= ruim ? 'm' : 'p');

exports.handler = async event => {
  try {
    if (event.httpMethod !== 'POST') return ok();
    const ua = event.headers['user-agent'] || '';
    if (!ua || BOT.test(ua)) return ok();
    let b = {}; try { b = JSON.parse(event.body || '{}'); } catch (e) { return ok(); }
    const ip = String(event.headers['x-nf-client-connection-ip'] || (event.headers['x-forwarded-for'] || '').split(',')[0] || '').trim();
    const dia = brDay(Date.now());
    const hash = crypto.createHash('sha256').update(`${ip}|${ua}|${dia}|${SALT}`).digest('hex').slice(0, 16);
    const t = await adminToken();
    const n = Number(await fb('GET', `stats/u/${dia}/${hash}`, undefined, t)) || 0;
    if (n >= MAX_POR_DIA) return ok();
    const up = {};
    if (b.t === 'w') {                                        // velocidade real (Core Web Vitals) — 1 por visita
      if (n === 0) return ok();                                 // só aceita de quem já contou como visita hoje
      const m = (nome, v, bom, ruim) => { v = Number(v); if (!(v >= 0) || v > 600000) return; up[`d/${dia}/vt/${nome}_n`] = INC; up[`d/${dia}/vt/${nome}_${faixa(v, bom, ruim)}`] = INC; up[`d/${dia}/vt/${nome}_s`] = { '.sv': { increment: Math.round(v) } }; };
      if (b.l > 0) m('lcp', b.l, 2500, 4000);
      if (b.c >= 0 && b.c !== undefined) m('cls', b.c, 100, 250);   // CLS ×1000
      if (b.i > 0) m('inp', b.i, 200, 500);
    } else {                                                  // visita
      const novo = n === 0;
      up[`d/${dia}/views`] = INC; up[`u/${dia}/${hash}`] = INC; up[`d/${dia}/pg/${pkey(b.p)}`] = INC;
      const r = String(b.r || '');
      if (r !== 'self' && (r || novo)) up[`d/${dia}/ref/${r ? grupo(r) : 'direto'}`] = INC;
      if (novo) {
        up[`d/${dia}/uniq`] = INC;
        if (b.ret) up[`d/${dia}/ret`] = INC;
        const w = Number(b.w) || 0; up[`d/${dia}/dev/${w && w < 768 ? 'mobile' : (w && w < 1100 ? 'tablet' : 'desktop')}`] = INC;
        let pais = 'xx'; try { const g = JSON.parse(Buffer.from(event.headers['x-nf-geo'] || '', 'base64').toString('utf8')); pais = String((g.country && g.country.code) || 'xx').toLowerCase().replace(/[^a-z]/g, '').slice(0, 2) || 'xx'; } catch (e) {}
        up[`d/${dia}/ct/${pais}`] = INC;
        if (Math.random() < 0.03) { for (const k of [2, 3, 4]) fb('DELETE', `stats/u/${brDay(Date.now() - k * 864e5)}`, undefined, t); }   // limpeza dos códigos diários antigos
      }
    }
    await fb('PATCH', 'stats', up, t);
  } catch (e) { /* contar visita nunca pode atrapalhar o site */ }
  return ok();
};
