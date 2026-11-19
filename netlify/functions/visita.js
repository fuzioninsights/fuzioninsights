// Contador de visitas próprio (sem serviço externo).
//  - Cada página manda 1 aviso minúsculo (POST /api/visita).
//  - Guarda números agregados por dia (/stats/d) e, para o painel do administrador, um registro por visitante
//    do dia (/stats/v): IP, localização aproximada (cidade/estado/país), aparelho, origem e página de entrada.
//    Os registros por visitante são apagados automaticamente depois de 30 dias.
//  - O código embaralhado (hash) do IP+navegador só serve para contar visitantes únicos e barrar abuso (/stats/u, apagado em dias).
//  - Robôs conhecidos (Google, Bing, redes sociais, monitores) são ignorados.
// Tudo fica em /stats no Firebase e é gravado com a conta do administrador (as mesmas variáveis do /premium).
// A localização vem do próprio Netlify (cabeçalho x-nf-geo). Opcional: STATS_GEO_FALLBACK=1 consulta ipwho.is quando o Netlify não informar a cidade.
//
// REGRAS DO FIREBASE (Realtime Database > Regras): "stats" só para o administrador, por exemplo:
//   "stats": { ".read": "auth.uid === 'SEU_UID_ADMIN'", ".write": "auth.uid === 'SEU_UID_ADMIN'" }
const crypto = require('crypto');
const DB = 'https://fuzion-insights-default-rtdb.firebaseio.com';
const KEY = process.env.FB_API_KEY || 'AIzaSyCwWE9YtckCT--utTkRJAqxk1_HWu0EJlM';
const SALT = process.env.STATS_SALT || KEY;
const MAX_POR_DIA = 400; // views por visitante/dia (acima disso é robô ou abuso)
const RETENCAO_DIAS = 30; // registros por visitante (IP/local) são apagados depois disso
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
const limpa = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001F\u007F]/g, '').slice(0, n);
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

// localização aproximada: cabeçalho do Netlify; (opcional) consulta externa se faltar
async function localizar(event, ip, externo) {
  let g = {}; try { g = JSON.parse(Buffer.from(event.headers['x-nf-geo'] || '', 'base64').toString('utf8')); } catch (e) {}
  let cidade = limpa(g.city, 60), regiao = limpa(g.subdivision && (g.subdivision.name || g.subdivision.code), 60), pais = limpa(g.country && g.country.code, 2).toLowerCase();
  if (!cidade && externo && process.env.STATS_GEO_FALLBACK === '1' && ip) {
    try {
      const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 1500);
      const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,city,region,country_code`, { signal: ac.signal }); clearTimeout(tm);
      const d = await r.json(); if (d && d.success) { cidade = limpa(d.city, 60); regiao = limpa(d.region, 60); pais = limpa(d.country_code, 2).toLowerCase() || pais; }
    } catch (e) {}
  }
  return { cidade, regiao, pais: pais.replace(/[^a-z]/g, '') || 'xx' };
}

exports.handler = async event => {
  try {
    if (event.httpMethod !== 'POST') return ok();
    const ua = event.headers['user-agent'] || '';
    if (!ua || BOT.test(ua)) return ok();
    let b = {}; try { b = JSON.parse(event.body || '{}'); } catch (e) { return ok(); }
    const ip = limpa(event.headers['x-nf-client-connection-ip'] || (event.headers['x-forwarded-for'] || '').split(',')[0] || '', 45).trim();
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
      const novo = n === 0, agora = Date.now();
      const w = Number(b.w) || 0, disp = w && w < 768 ? 'mobile' : (w && w < 1100 ? 'tablet' : 'desktop');
      const r = String(b.r || ''), rg = r === 'self' ? '' : (r ? grupo(r) : 'direto');
      const pg = limpa(b.p, 120);
      up[`d/${dia}/views`] = INC; up[`u/${dia}/${hash}`] = INC; up[`d/${dia}/pg/${pkey(b.p)}`] = INC;
      if (r !== 'self' && (r || novo)) up[`d/${dia}/ref/${rg}`] = INC;
      const loc = await localizar(event, ip, novo);   // consulta externa (se ligada) só na 1ª página do visitante no dia
      const v = `v/${dia}/${hash}`;                           // registro do visitante (só o administrador lê)
      up[`${v}/ip`] = ip; up[`${v}/dv`] = disp;
      if (novo || loc.cidade) { up[`${v}/ci`] = loc.cidade; up[`${v}/rg`] = loc.regiao; }   // não apaga a cidade achada na 1ª visita
      if (novo || loc.pais !== 'xx') up[`${v}/ct`] = loc.pais;
      up[`${v}/n`] = INC; up[`${v}/lt`] = agora; up[`${v}/lp`] = pg;
      if (novo) {
        up[`${v}/t`] = agora; up[`${v}/p`] = pg; up[`${v}/rf`] = rg || 'direto';
        up[`d/${dia}/uniq`] = INC;
        if (b.ret) up[`d/${dia}/ret`] = INC;
        up[`d/${dia}/dev/${disp}`] = INC;
        up[`d/${dia}/ct/${loc.pais}`] = INC;
        if (Math.random() < 0.03) {                           // limpeza: códigos diários antigos e registros além da retenção
          for (const k of [2, 3, 4]) fb('DELETE', `stats/u/${brDay(Date.now() - k * 864e5)}`, undefined, t);
          for (const k of [RETENCAO_DIAS + 1, RETENCAO_DIAS + 2, RETENCAO_DIAS + 3]) fb('DELETE', `stats/v/${brDay(Date.now() - k * 864e5)}`, undefined, t);
        }
      }
    }
    await fb('PATCH', 'stats', up, t);
  } catch (e) { /* contar visita nunca pode atrapalhar o site */ }
  return ok();
};
