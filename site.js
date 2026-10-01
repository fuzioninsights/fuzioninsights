/* Fuzion Insights — utilitários compartilhados */
const SITE = {
  name: 'Fuzion Insights',
  firebaseKey: 'AIzaSyCwWE9YtckCT--utTkRJAqxk1_HWu0EJlM',
  db: 'https://fuzion-insights-default-rtdb.firebaseio.com',
  adClient: 'ca-pub-6909799094388328',
  // Cole aqui o ID numérico (data-ad-slot) de cada unidade de anúncio criada no AdSense.
  // Enquanto estiver vazio, o espaço NÃO aparece no site (caixas vazias prejudicam a aprovação).
    // top = faixa abaixo do cabeçalho · feed = entre os cards da home · sidebar = coluna lateral da home
  // inline = no meio do artigo · end = no fim do artigo
  adSlots: { top: '', feed: '', sidebar: '', inline: '', end: '' },
  // Assinatura paga. Cole em "checkout" o link de pagamento (Mercado Pago, Stripe Payment Link, Kiwify etc.).
  // Enquanto estiver vazio, o pedido é salvo como "interesse" e você envia o link por e-mail.
  plans: {
    mensal: { nome: 'Mensal', preco: 11,  checkout: '' },
    anual:  { nome: 'Anual',  preco: 114, checkout: '' }
  }
};

/* Ícones (traço fino, estilo atual) */
const ICON = {
  share: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 15V3"/><path d="M8 7l4-4 4 4"/><path d="M5 12v6a3 3 0 003 3h8a3 3 0 003-3v-6"/></svg>',
  link: '<svg class="ic" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
  whatsapp: '<svg class="ic" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>',
  x: '<svg class="ic f" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 7.778 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.335L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  linkedin: '<svg class="ic" viewBox="0 0 24 24"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
  facebook: '<svg class="ic" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>',
  telegram: '<svg class="ic" viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>'
};

/* Link de compartilhamento: usa /s/<id> (card com imagem) quando a função do Netlify estiver publicada; senão o link normal */
let _shareOk = null;
async function shareUrl(id) {
  if (_shareOk === null) {
    try { const r = await fetch('/s/_ping', { cache: 'no-store' }); _shareOk = r.headers.get('x-fz-share') === '1'; } catch (e) { _shareOk = false; }
  }
  return _shareOk ? `${location.origin}/s/${encodeURIComponent(id)}` : `${location.origin}/artigo.html?id=${encodeURIComponent(id)}`;
}

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* Sanitiza HTML de artigos: só tags de texto simples, links http(s)/mailto */
function sanitizeHTML(html) {
  const doc = new DOMParser().parseFromString('<body>' + (html || ''), 'text/html');
  const out = document.createElement('div');
  const KEEP = {P:1,BR:1,STRONG:1,EM:1,U:1,H2:1,H3:1,UL:1,OL:1,LI:1,BLOCKQUOTE:1,A:1};
  const MAP = {B:'STRONG',I:'EM',DIV:'P',H1:'H2',H4:'H3',H5:'H3',H6:'H3'};
  const DROP = {SCRIPT:1,STYLE:1,IFRAME:1,OBJECT:1,EMBED:1,NOSCRIPT:1,TEMPLATE:1,LINK:1,META:1,SVG:1,MATH:1,FORM:1,INPUT:1,BUTTON:1};
  (function walk(src, dst) {
    src.childNodes.forEach(n => {
      if (n.nodeType === 3) { dst.appendChild(document.createTextNode(n.nodeValue)); return; }
      if (n.nodeType !== 1) return;
      let t = n.tagName; if (DROP[t]) return; t = MAP[t] || t;
      if (KEEP[t]) {
        const el = document.createElement(t);
        if (t === 'A') {
          const h = (n.getAttribute('href') || '').trim();
          if (/^(https?:\/\/|mailto:)/i.test(h)) { el.setAttribute('href', h); el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer nofollow'); }
        }
        dst.appendChild(el); walk(n, el);
      } else walk(n, dst);
    });
  })(doc.body, out);
  return out.innerHTML;
}

/* Datas: usa a.date; artigos antigos derivam a data do id ("art-<timestamp>") */
function artDate(a) {
  if (a.date) { const d = new Date(a.date); if (!isNaN(d)) return d; }
  const m = /^art-(\d{10,})$/.exec(a.id || '');
  return m ? new Date(+m[1]) : null;
}
const fmtDate = d => d ? d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const fmtDateShort = d => d ? d.toLocaleDateString('pt-BR') : '';
const isoDay = d => d ? d.toISOString().slice(0, 10) : '';

/* Autenticação anônima (newsletter, comentários, contagem de views) */
let idToken = null;
function signInAnon() {
  return fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${SITE.firebaseKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true })
  }).then(r => r.json()).then(d => { idToken = d.idToken; }).catch(() => {});
}
const ensureAuth = () => idToken ? Promise.resolve(idToken) : signInAnon().then(() => idToken);

function saveSubscriber(email, plano) {
  const sub = { email, plano: plano || 'gratuito', date: new Date().toLocaleDateString('pt-BR') };
  return ensureAuth().then(t => fetch(`${SITE.db}/assinantes.json?auth=${t}`, { method: 'POST', body: JSON.stringify(sub) }))
    .then(r => { if (!r.ok) throw 0; if (window.loadSubs) loadSubs(); });
}
function subscribeNewsletter(e, formEl) {
  e.preventDefault();
  const email = formEl.querySelector('input[type="email"]').value.trim();
  if (!email) return false;
  saveSubscriber(email, 'gratuito').then(() => { alert('E-mail cadastrado na Fuzion Insights!'); formEl.reset(); })
    .catch(() => alert('Não foi possível cadastrar agora. Tente novamente.'));
  return false;
}

/* Ticker de câmbio — só dados reais da API; se falhar, o ticker some (nada de valores inventados) */
function fMkt() {
  const el1 = $('t1'), el2 = $('t2'); if (!el1 || !el2) return;
  fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,GBP-BRL,BTC-USD').then(r => r.json()).then(d => {
    const fmt = v => parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const cls = v => parseFloat(v) >= 0 ? 'ticker-green' : 'ticker-red';
    const sig = v => parseFloat(v) >= 0 ? '+' : '';
    const item = (label, x, pre, val) => `<div class="ticker-item"><span>${label}:</span> <span class="${cls(x.pctChange)}">${pre} ${val} (${sig(x.pctChange)}${parseFloat(x.pctChange).toFixed(2)}%)</span></div>`;
    const h = item('DÓLAR (USD/BRL)', d.USDBRL, 'R$', fmt(d.USDBRL.bid)) + item('EURO (EUR/BRL)', d.EURBRL, 'R$', fmt(d.EURBRL.bid)) +
      item('LIBRA (GBP/BRL)', d.GBPBRL, 'R$', fmt(d.GBPBRL.bid)) + item('BITCOIN (BTC/USD)', d.BTCUSD, 'US$', parseFloat(d.BTCUSD.bid).toLocaleString('pt-BR', { maximumFractionDigits: 0 }));
    el1.innerHTML = h; el2.innerHTML = h;
    el1.closest('.ticker-outer').style.display = 'flex';
  }).catch(() => { if (!el1.innerHTML) el1.closest('.ticker-outer').style.display = 'none'; });
}

/* Blocos de anúncio: só existem se houver ID configurado.
   Para ver onde cada anúncio vai ficar ANTES de ter os IDs, abra o site com ?adpreview=1 (desliga com ?adpreview=0). */
const AD_PREVIEW = (() => {
  try { const q = new URLSearchParams(location.search).get('adpreview'); if (q === '1') sessionStorage.setItem('fz_adprev', '1'); if (q === '0') sessionStorage.removeItem('fz_adprev'); return sessionStorage.getItem('fz_adprev') === '1'; } catch (e) { return false; }
})();
const AD_PH_H = { top: 90, feed: 250, sidebar: 250, inline: 250, end: 250 };
function createAd(key) { const d = document.createElement('div'); d.className = 'ad-box'; d.dataset.ad = key; return d; }
function initAds(root) {
  (root || document).querySelectorAll('[data-ad]:not([data-ad-ready])').forEach(box => {
    const slot = SITE.adSlots[box.dataset.ad];
    if (!slot && !AD_PREVIEW) { box.remove(); return; }
    box.dataset.adReady = '1';
    box.innerHTML = '<div class="ad-label">Publicidade</div><div class="ad-slot"></div>';
    const holder = box.querySelector('.ad-slot');
    if (!slot) { holder.innerHTML = `<div class="ad-ph" style="min-height:${AD_PH_H[box.dataset.ad] || 250}px">Pré-visualização do anúncio: “${box.dataset.ad}” (configure o ID em site.js)</div>`; return; }
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle'; ins.style.display = 'block';
    ins.dataset.adClient = SITE.adClient; ins.dataset.adSlot = slot;
    ins.dataset.adFormat = 'auto'; ins.dataset.fullWidthResponsive = 'true';
    holder.appendChild(ins);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  });
}

/* Banner de cookies / consentimento (LGPD) */
function cookieBanner(force) {
  let c = null; try { c = localStorage.getItem('fz_consent'); } catch (e) {}
  if (c && !force) return;
  document.querySelector('.cookie-bar')?.remove();
  const bar = document.createElement('div'); bar.className = 'cookie-bar'; bar.setAttribute('role', 'dialog'); bar.setAttribute('aria-label', 'Aviso de cookies');
  bar.innerHTML = `<p>Usamos cookies para o funcionamento do site, estatísticas e para exibir anúncios (Google AdSense). Você pode aceitar anúncios personalizados ou manter apenas anúncios não personalizados. Saiba mais na <a href="privacidade.html">Política de Privacidade</a>.</p>
    <div class="acts"><button type="button" data-c="essential">Somente essenciais</button><button type="button" class="pri" data-c="all">Aceitar</button></div>`;
  bar.querySelectorAll('button').forEach(b => b.onclick = () => {
    try { localStorage.setItem('fz_consent', b.dataset.c); } catch (e) {}
    bar.remove(); if (b.dataset.c === 'essential') location.reload();
  });
  document.body.appendChild(bar);
}

/* Botão "Assine": planos + cadastro */
function openSubscribe() {
  if (document.querySelector('.sub-modal')) return;
  const P = SITE.plans, eco = P.mensal.preco * 12 - P.anual.preco, mes = (P.anual.preco / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const m = document.createElement('div'); m.className = 'sub-modal';
  m.innerHTML = `<div class="sub-card" role="dialog" aria-label="Assinar a Fuzion Insights"><button class="sub-x" aria-label="Fechar">×</button>
    <h3>Assine a Fuzion Insights</h3><p>Apoie a redação independente e receba o Fuzion Briefing semanal.</p>
    <form>
      <div class="plans">
        <label class="plan"><input type="radio" name="plano" value="mensal"><span class="pn">Mensal</span><span class="pp">R$ ${P.mensal.preco}<small>/mês</small></span><span class="ps">Cancele quando quiser</span></label>
        <label class="plan sel"><input type="radio" name="plano" value="anual" checked><span class="tag">Melhor valor</span><span class="pn">Anual</span><span class="pp">R$ ${P.anual.preco}<small>/ano</small></span><span class="ps">R$ ${mes}/mês · economize R$ ${eco}</span></label>
      </div>
      <input type="email" placeholder="Seu melhor e-mail" required aria-label="E-mail">
      <button class="btn" type="submit">Continuar</button>
    </form>
    <a class="sub-free">Prefiro apenas a newsletter gratuita</a></div>`;
  const close = () => m.remove();
  const form = m.querySelector('form');
  m.addEventListener('click', e => { if (e.target === m) close(); });
  m.querySelector('.sub-x').onclick = close;
  form.addEventListener('change', () => m.querySelectorAll('.plan').forEach(p => p.classList.toggle('sel', p.querySelector('input').checked)));
  const send = (plano) => {
    const email = form.querySelector('input[type="email"]').value.trim();
    if (!email) { form.querySelector('input[type="email"]').reportValidity(); return; }
    saveSubscriber(email, plano).then(() => {
      const link = plano !== 'gratuito' && SITE.plans[plano].checkout;
      if (link) { location.href = link; return; }
      alert(plano === 'gratuito' ? 'E-mail cadastrado na Fuzion Insights!' : `Recebemos seu interesse no plano ${SITE.plans[plano].nome}! Enviaremos o link de pagamento para ${email}.`);
      close();
    }).catch(() => alert('Não foi possível concluir agora. Tente novamente.'));
  };
  form.onsubmit = e => { e.preventDefault(); send(form.plano.value); };
  m.querySelector('.sub-free').onclick = () => send('gratuito');
  document.body.appendChild(m); form.querySelector('input[type="email"]').focus();
}

/* Altura do header fixo -> usada pela barra de estilo do editor */
function trackHeader() {
  const h = document.querySelector('.top-fixed') || document.querySelector('.site-header'); if (!h) return;
  const set = () => document.documentElement.style.setProperty('--hdr-h', getComputedStyle(h).position === 'sticky' ? h.offsetHeight + 'px' : '0px');
  set(); window.addEventListener('resize', set);
  if (window.ResizeObserver) new ResizeObserver(set).observe(h);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-year]').forEach(e => e.textContent = new Date().getFullYear());
  document.querySelectorAll('[data-cookie-prefs]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); cookieBanner(true); }));
  document.querySelectorAll('[data-subscribe]').forEach(b => b.addEventListener('click', openSubscribe));
  cookieBanner(); trackHeader(); initAds(); fMkt(); setInterval(fMkt, 60000);
});
