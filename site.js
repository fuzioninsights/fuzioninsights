/* Fuzion Insights — utilitários compartilhados */
const SITE = {
  name: 'Fuzion Insights',
  autoPay: true,   // o botão só aparece quando MP_ACCESS_TOKEN (Mercado Pago) estiver configurado no Netlify
  firebaseKey: 'AIzaSyCwWE9YtckCT--utTkRJAqxk1_HWu0EJlM',
  db: 'https://fuzion-insights-default-rtdb.firebaseio.com',
  adClient: 'ca-pub-6909799094388328',
  // Cole aqui o ID numérico (data-ad-slot) de cada unidade de anúncio criada no AdSense.
  // Enquanto estiver vazio, o espaço NÃO aparece no site (caixas vazias prejudicam a aprovação).
    // top = faixa abaixo do cabeçalho · feed = entre os cards da home · sidebar = coluna lateral da home
  // inline = no meio do artigo · end = no fim do artigo
  adSlots: { top: '7762672961', feed: '3532793076', sidebar: '1384218444', inline: '4749496810', end: '5823914492',
    // mid = faixa entre o slider/vídeos e as matérias · side2 = 2º anúncio da coluna lateral (reaproveitam as unidades acima; crie unidades novas no AdSense se quiser relatórios separados)
    mid: '3532793076', side2: '1384218444' },
  // Player de vídeos da home (YouTube). Sem configurar nada, mostra os últimos vídeos do canal abaixo.
  // Para escolher os vídeos: videos: [{ id: 'ID_DE_11_LETRAS', title: 'Título' }, …]  ·  ou playlistId: 'PL…'
  video: { handle: '@fuzioninsights', channelId: 'UCXNsYZ1mfIGO--TIa66_tCQ', playlistId: '', videos: [] },
  // E-mail que recebe TODAS as mensagens do site (comentários, contato, newsletter, pedidos de assinatura)
  // e que também é a chave Pix para receber os pagamentos.
  // Texto do botão do topo: 'Assine' ou 'Apoie' (troque aqui; vale para o site inteiro)
  botao: 'Assine',
  email: 'fuzioninsights@gmail.com',
  pix: { chave: 'fuzioninsights@gmail.com', nome: 'FUZION INSIGHTS', cidade: 'BRASIL' },
  // Cartão/PayPal: só ligue (true) se o e-mail acima tiver conta PayPal. Para cartão direto, cole um link em "checkout" dos planos.
  paypal: false,
  plans: {
    mensal: { nome: 'Mensal', preco: 11,  checkout: '' },
    anual:  { nome: 'Anual',  preco: 114, checkout: '' }
  }
};

/* Sessão do assinante (fica só neste navegador). O texto exclusivo nunca vem do banco público: a função /premium confere o código a cada leitura. */
const todayISO = () => new Date().toISOString().slice(0, 10);
const Member = {
  get() {
    try { const m = JSON.parse(localStorage.getItem('fz_member') || 'null'); if (m && m.email && m.codigo && (!m.ate || m.ate >= todayISO())) return m; localStorage.removeItem('fz_member'); } catch (e) {}
    return null;
  },
  set(m) { try { localStorage.setItem('fz_member', JSON.stringify(m)); } catch (e) {} },
  clear() { try { localStorage.removeItem('fz_member'); } catch (e) {} },
  /* confere acesso (e, se vier "id", traz o texto exclusivo do artigo). Devolve {ok, ...} */
  async check(email, codigo, id) {
    try {
      const r = await fetch('/.netlify/functions/premium', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, codigo, id: id || '' }) });
      const d = await r.json().catch(() => ({})); d.status = r.status; return d;
    } catch (e) { return { ok: false, erro: 'rede', status: 0 }; }
  }
};
Member.checkToken = async (token, id) => {   // acesso pelo login (Google/e-mail): o servidor confere o e-mail em /ativos
  try {
    const r = await fetch('/.netlify/functions/premium', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, id: id || '' }) });
    const d = await r.json().catch(() => ({})); d.status = r.status; return d;
  } catch (e) { return { ok: false, erro: 'rede', status: 0 }; }
};
const makeCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
const fmtCode = c => String(c || '').replace(/(.{4})(?=.)/g, '$1-');
/* chave da ficha do assinante ativo (igual à da função /premium) */
const emailKey = e => String(e).trim().toLowerCase().replace(/[.#$\[\]\/]/g, ',');

/* Ícones: glifos oficiais das marcas (preenchidos) + ícones de ação em traço */
const ICON = {
  share: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 15V3"/><path d="M8 7l4-4 4 4"/><path d="M5 12v6a3 3 0 003 3h8a3 3 0 003-3v-6"/></svg>',
  link: '<svg class="ic" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
  check: '<svg class="ic" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
  whatsapp: '<svg class="ic f" viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>',
  x: '<svg class="ic f" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 7.778 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.335L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  linkedin: '<svg class="ic f" viewBox="0 0 448 512"><path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z"/></svg>',
  facebook: '<svg class="ic f" viewBox="0 0 320 512"><path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/></svg>',
  telegram: '<svg class="ic f" viewBox="0 0 448 512"><path d="M446.7 98.6l-67.6 318.8c-5.1 22.5-18.4 28.1-37.3 17.5l-103-75.9-49.7 47.8c-5.5 5.5-10.1 10.1-20.7 10.1l7.4-104.9 190.9-172.5c8.3-7.4-1.8-11.5-12.9-4.1L117.8 284 16.2 252.2c-22.1-6.9-22.5-22.1 4.6-32.7L418.2 66.4c18.4-6.9 34.5 4.1 28.5 32.2z"/></svg>'
};

/* Aviso rápido (substitui alert) e cópia para a área de transferência */
function toast(msg) {
  document.querySelector('.fz-toast')?.remove();
  const t = document.createElement('div'); t.className = 'fz-toast'; t.setAttribute('role', 'status');
  t.innerHTML = ICON.check + '<span></span>'; t.querySelector('span').textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2300); setTimeout(() => t.remove(), 2700);
}
function copyText(txt, okMsg) {
  const done = () => toast(okMsg || 'Copiado!');
  if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(txt).then(done, () => fallbackCopy(txt, done)); }
  else fallbackCopy(txt, done);
}
function fallbackCopy(txt, done) {
  const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta);
  ta.select(); try { document.execCommand('copy'); done(); } catch (e) { prompt('Copie manualmente:', txt); } ta.remove();
}

/* Endereço amigável: /artigo/nome-da-materia (parte do título). Artigos antigos, sem "slug", derivam do título. */
const slugify = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
function slugFromTitle(t) {
  let s = slugify(t); if (s.length > 60) { s = s.slice(0, 60); const k = s.lastIndexOf('-'); if (k > 25) s = s.slice(0, k); }
  return s.replace(/-+$/, '') || 'artigo';
}
const artSlug = a => a.slug || slugFromTitle(a.title);
const artUrl = a => '/artigo/' + encodeURIComponent(artSlug(a));
const tagList = a => (Array.isArray(a.tags) ? a.tags : (a.tags ? Object.values(a.tags) : [])).map(t => String(t).replace(/^#+\s*/, '').trim()).filter(Boolean);

/* Link de compartilhamento: usa /s/<id> (card com imagem) quando a função do Netlify estiver publicada; senão o link normal */
let _shareOk = null;
async function shareUrl(a) {
  if (_shareOk === null) {
    try { const r = await fetch('/s/_ping', { cache: 'no-store' }); _shareOk = r.headers.get('x-fz-share') === '1'; } catch (e) { _shareOk = false; }
  }
  return _shareOk ? `${location.origin}/s/${encodeURIComponent(a.id)}` : location.origin + artUrl(a);
}

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* Vídeos: aceita só YouTube e Vimeo e devolve o endereço de incorporação seguro */
function embedSrc(u) {
  u = (u || '').trim(); let m;
  if ((m = /^https?:\/\/(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#\s]*&)?v=|embed\/|shorts\/|live\/)([\w-]{11})/i.exec(u)) || (m = /^https?:\/\/youtu\.be\/([\w-]{11})/i.exec(u))) return 'https://www.youtube-nocookie.com/embed/' + m[1];
  if ((m = /^https?:\/\/(?:www\.)?vimeo\.com\/(?:video\/)?(\d+)/i.exec(u)) || (m = /^https?:\/\/player\.vimeo\.com\/video\/(\d+)/i.exec(u))) return 'https://player.vimeo.com/video/' + m[1];
  return null;
}
const videoHtml = src => `<div class="video"><iframe src="${src}" title="Vídeo" loading="lazy" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;

/* Sanitiza HTML de artigos: texto, tabelas, imagens https, vídeos YouTube/Vimeo e links http(s)/mailto */
function sanitizeHTML(html) {
  const doc = new DOMParser().parseFromString('<body>' + (html || ''), 'text/html');
  const out = document.createElement('div');
  const KEEP = {P:1,BR:1,STRONG:1,EM:1,U:1,H2:1,H3:1,UL:1,OL:1,LI:1,BLOCKQUOTE:1,A:1,TABLE:1,THEAD:1,TBODY:1,TR:1,TH:1,TD:1,HR:1,FIGURE:1,FIGCAPTION:1};
  const MAP = {B:'STRONG',I:'EM',DIV:'P',H1:'H2',H4:'H3',H5:'H3',H6:'H3',TFOOT:'TBODY'};
  const DROP = {SCRIPT:1,STYLE:1,IFRAME:1,OBJECT:1,EMBED:1,NOSCRIPT:1,TEMPLATE:1,LINK:1,META:1,SVG:1,MATH:1,FORM:1,INPUT:1,BUTTON:1,TEXTAREA:1,SELECT:1};
  (function walk(src, dst) {
    src.childNodes.forEach(n => {
      if (n.nodeType === 3) { dst.appendChild(document.createTextNode(n.nodeValue)); return; }
      if (n.nodeType !== 1) return;
      let t = n.tagName; const st = n.getAttribute('style') || '';
      if (t === 'FIGURE' && n.classList.contains('fz-embed')) { // bloco HTML incorporado: só guarda o código (base64) e as opções
        const code = (n.getAttribute('data-fz') || '').trim();
        if (/^[A-Za-z0-9+/=]{4,70000}$/.test(code)) {
          const f = document.createElement('figure'); f.className = 'fz-embed'; f.setAttribute('data-fz', code);
          const h = parseInt(n.getAttribute('data-h'), 10); if (h >= 80 && h <= 2000) f.setAttribute('data-h', h);
          const ti = (n.getAttribute('data-t') || '').replace(/[\u0000-\u001f]/g, '').slice(0, 120); if (ti) f.setAttribute('data-t', ti);
          dst.appendChild(f);
        }
        return;
      }
      if (t === 'IMG') {
        const s = (n.getAttribute('src') || '').trim();
        if (/^https:\/\//i.test(s)) {
          const el = document.createElement('img'); const alt = (n.getAttribute('alt') || '').trim().slice(0, 200);
          el.setAttribute('src', s); el.setAttribute('alt', alt); el.setAttribute('loading', 'lazy'); el.setAttribute('referrerpolicy', 'no-referrer');
          // imagem solta com descrição vira figura com legenda; dentro de <figure> a legenda já existe
          if (alt && !(dst.tagName === 'FIGURE' || (n.parentNode && n.parentNode.tagName === 'FIGURE'))) {
            const fg = document.createElement('figure'); const fc = document.createElement('figcaption'); fc.textContent = alt; fg.appendChild(el); fg.appendChild(fc); dst.appendChild(fg);
          } else dst.appendChild(el);
        }
        return;
      }
      if (t === 'IFRAME') {
        const s = embedSrc(n.getAttribute('src') || '');
        if (s) { const tmp = document.createElement('div'); tmp.innerHTML = videoHtml(s); dst.appendChild(tmp.firstChild); }
        return;
      }
      if (DROP[t]) return;
      if (t === 'DIV' && n.classList.contains('video')) { walk(n, dst); return; }
      if ((t === 'B' || t === 'STRONG') && /font-weight\s*:\s*(normal|400)/i.test(st)) { walk(n, dst); return; } // Google Docs embrulha tudo em <b>
      if (t === 'SPAN') { // negrito/itálico vindos de Word e Google Docs
        let w = dst;
        if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(st)) { const e = document.createElement('strong'); w.appendChild(e); w = e; }
        if (/font-style\s*:\s*italic/i.test(st)) { const e = document.createElement('em'); w.appendChild(e); w = e; }
        walk(n, w); return;
      }
      t = MAP[t] || t;
      if (KEEP[t]) {
        const el = document.createElement(t);
        if (t === 'A') {
          const h = (n.getAttribute('href') || '').trim();
          if (/^(https?:\/\/|mailto:)/i.test(h)) { el.setAttribute('href', h); el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer nofollow'); }
          else if (h === '#assine') el.setAttribute('href', '#assine');   // link interno: abre a tela de assinatura
        }
        dst.appendChild(el); walk(n, el);
      } else walk(n, dst);
    });
  })(doc.body, out);
  return out.innerHTML;
}

/* Markdown -> HTML (para colar textos do ChatGPT/Claude/Word já formatados) */
function mdInline(text) {
  const stash = []; const keep = h => { stash.push(h); return '\u0001' + (stash.length - 1) + '\u0002'; };
  let t = String(text);
  t = t.replace(/!\[([^\]]*)\]\(\s*(https:\/\/[^\s)]+)[^)]*\)/g, (m, a, u) => keep(`<img src="${esc(u)}" alt="${esc(a)}">`));
  t = t.replace(/\[([^\]]+)\]\(\s*((?:https?:\/\/|mailto:)[^\s)]+)[^)]*\)/g, (m, a, u) => keep(`<a href="${esc(u)}">${mdInline(a)}</a>`));
  t = t.replace(/(^|[\s(])(https?:\/\/[^\s<>"')]+[^\s<>"').,;:!?])/g, (m, p, u) => p + keep(`<a href="${esc(u)}">${esc(u)}</a>`));
  t = esc(t);
  t = t.replace(/\*\*\*([^*\n]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
       .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
       .replace(/__([^_\n]+?)__/g, '<strong>$1</strong>')
       .replace(/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?!\*)/g, '$1<em>$2</em>')
       .replace(/(^|[^_\w])_([^_\s][^_\n]*?)_(?![_\w])/g, '$1<em>$2</em>')
       .replace(/~~([^~\n]+)~~/g, '$1').replace(/`([^`\n]+)`/g, '$1');
  return t.replace(/\u0001(\d+)\u0002/g, (m, i) => stash[+i]);
}
function mdToHtml(src) {
  const L = String(src).replace(/\r/g, '').split('\n'); const out = []; let i = 0;
  const HEAD = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/, HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/, LI = /^\s*(?:[-*+•]|\d+[.)])\s+/, QUOTE = /^\s{0,3}>\s?/;
  const isSep = l => !!l && l.includes('|') && l.includes('-') && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
  const cells = l => { let s = l.trim(); if (s.startsWith('|')) s = s.slice(1); if (s.endsWith('|')) s = s.slice(0, -1); return s.split('|').map(c => c.trim()); };
  const media = l => {
    const u = l.trim(); let m;
    if ((m = /^\[[^\]]*\]\(\s*(https?:\/\/[^\s)]+)[^)]*\)$/.exec(u)) && embedSrc(m[1])) return videoHtml(embedSrc(m[1]));
    if ((m = /^!\[([^\]]*)\]\(\s*(https:\/\/[^\s)]+)[^)]*\)$/.exec(u))) return m[1].trim() ? `<figure><img src="${esc(m[2])}" alt="${esc(m[1])}"><figcaption>${esc(m[1])}</figcaption></figure>` : `<p><img src="${esc(m[2])}" alt=""></p>`;
    if (!/^https?:\/\/\S+$/i.test(u)) return null;
    const e = embedSrc(u); if (e) return videoHtml(e);
    if (/^https:\/\/\S+\.(jpe?g|png|gif|webp|avif)(\?\S*)?$/i.test(u)) return `<p><img src="${esc(u)}" alt=""></p>`;
    return `<p><a href="${esc(u)}">${esc(u)}</a></p>`;
  };
  const startsBlock = k => { const l = L[k]; return HEAD.test(l) || HR.test(l) || LI.test(l) || QUOTE.test(l) || (l.includes('|') && isSep(L[k + 1])) || !!media(l); };
  while (i < L.length) {
    const line = L[i]; let m;
    if (!line.trim()) { i++; continue; }
    if ((m = HEAD.exec(line))) { const h = m[1].length <= 2 ? 'h2' : 'h3'; out.push(`<${h}>${mdInline(m[2])}</${h}>`); i++; continue; }
    if (HR.test(line)) { out.push('<hr>'); i++; continue; }
    if (line.includes('|') && isSep(L[i + 1])) {
      const head = cells(line); i += 2; const rows = [];
      while (i < L.length && L[i].trim() && L[i].includes('|')) { rows.push(cells(L[i])); i++; }
      out.push('<table><thead><tr>' + head.map(c => `<th>${mdInline(c)}</th>`).join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + head.map((_, k) => `<td>${mdInline(r[k] || '')}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    if (QUOTE.test(line)) { const q = []; while (i < L.length && QUOTE.test(L[i])) { q.push(L[i].replace(QUOTE, '')); i++; } out.push('<blockquote>' + mdInline(q.join(' ').trim()) + '</blockquote>'); continue; }
    if (LI.test(line)) {
      const ord = /^\s*\d+[.)]\s+/.test(line), items = [];
      while (i < L.length) {
        if (LI.test(L[i])) { items.push(L[i].replace(LI, '')); i++; }
        else if (!L[i].trim() && i + 1 < L.length && LI.test(L[i + 1])) i++;
        else break;
      }
      const tag = ord ? 'ol' : 'ul'; out.push(`<${tag}>` + items.map(x => `<li>${mdInline(x)}</li>`).join('') + `</${tag}>`); continue;
    }
    const md = media(line); if (md) { out.push(md); i++; continue; }
    const p = [line.trim()]; i++;
    while (i < L.length && L[i].trim() && !startsBlock(i)) { p.push(L[i].trim()); i++; }
    out.push('<p>' + mdInline(p.join(' ')) + '</p>');
  }
  return out.join('');
}

/* Sessão do administrador: renova o acesso sozinha (o Firebase vence em 1h, aqui é renovado a cada ~55 min) */
const Admin = {
  get token() { return sessionStorage.getItem('adminToken'); },
  save(d) {
    const id = d.idToken || d.id_token, rt = d.refreshToken || d.refresh_token, exp = +(d.expiresIn || d.expires_in || 3600);
    sessionStorage.setItem('auth', 'true'); sessionStorage.setItem('adminToken', id);
    if (rt) sessionStorage.setItem('adminRefresh', rt);
    sessionStorage.setItem('adminExp', String(Date.now() + exp * 1000));
    return id;
  },
  clear() { ['auth', 'adminToken', 'adminRefresh', 'adminExp'].forEach(k => sessionStorage.removeItem(k)); },
  async refresh() {
    const rt = sessionStorage.getItem('adminRefresh'); if (!rt) return null;
    try {
      const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${SITE.firebaseKey}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(rt) });
      const d = await r.json(); return d.id_token ? this.save(d) : null;
    } catch (e) { return null; }
  },
  async fresh() {
    const t = this.token; if (!t) return null;
    const exp = +sessionStorage.getItem('adminExp') || 0;
    if (!exp && !sessionStorage.getItem('adminRefresh')) return t;       // sessão antiga, sem dados de renovação
    if (exp && Date.now() < exp - 5 * 60 * 1000) return t;                 // ainda válido por mais de 5 min
    return (await this.refresh()) || (Date.now() < exp ? t : null);
  }
};

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

/* Envia uma cópia de cada mensagem do site para o e-mail da redação (serviço FormSubmit).
   Nunca bloqueia o leitor: se falhar, o dado continua salvo no Firebase. Devolve true/false. */
function notifyEmail(assunto, campos) {
  const body = Object.assign({ _subject: '[Fuzion Insights] ' + assunto, _template: 'table', _captcha: 'false', _honey: '' }, campos || {}, { pagina: location.href });
  return fetch('https://formsubmit.co/ajax/' + SITE.email, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body) })
    .then(r => r.json()).then(d => d.success === true || d.success === 'true').catch(() => false);
}
const makeRef = () => 'FZ' + Array.from(crypto.getRandomValues(new Uint8Array(8)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
const brl = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function saveSubscriber(email, plano, extra) {
  const sub = Object.assign({ email, plano: plano || 'gratuito', date: new Date().toLocaleDateString('pt-BR') }, extra || {});
  const pago = sub.plano !== 'gratuito' && SITE.plans[sub.plano];
  const fb = ensureAuth().then(t => fetch(`${SITE.db}/assinantes.json?auth=${t}`, { method: 'POST', body: JSON.stringify(sub) }))
    .then(r => { if (!r.ok) throw 0; if (window.loadSubs) loadSubs(); });
  const mail = notifyEmail(pago ? `Novo pedido de assinatura (${pago.nome})` : 'Nova inscrição na newsletter',
    { email, plano: sub.plano, valor: pago ? brl(pago.preco) : 'gratuito', referencia: sub.ref || '', status: sub.status || 'newsletter' });
  // sucesso se ao menos um dos dois registrou o pedido
  return Promise.allSettled([fb, mail]).then(([x, y]) => { if (x.status !== 'fulfilled' && !(y.status === 'fulfilled' && y.value)) throw 0; });
}
function subscribeNewsletter(e, formEl) {
  e.preventDefault();
  const email = formEl.querySelector('input[type="email"]').value.trim();
  if (!email) return false;
  fetch('/.netlify/functions/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, site_url: (formEl.querySelector('[name="site_url"]') || {}).value || '' }) }).catch(() => {});
  saveSubscriber(email, 'gratuito').then(() => { toast('E-mail cadastrado na Fuzion Insights!'); formEl.reset(); })
    .catch(() => toast('Não foi possível cadastrar agora. Tente novamente.'));
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
const AD_PH_H = { top: 90, feed: 250, sidebar: 250, inline: 250, end: 250, mid: 90, side2: 250 };
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

/* Pix copia-e-cola (BR Code estático, chave = e-mail) */
function crc16(str) {
  let c = 0xFFFF;
  for (let i = 0; i < str.length; i++) { c ^= str.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) : (c << 1); c &= 0xFFFF; }
  return c.toString(16).toUpperCase().padStart(4, '0');
}
function pixPayload(o) {
  const f = (id, v) => id + String(v.length).padStart(2, '0') + v;
  const norm = (t, n) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, n);
  const p = f('00', '01') + f('01', '11') + f('26', f('00', 'br.gov.bcb.pix') + f('01', o.chave)) + f('52', '0000') + f('53', '986') +
    f('54', Number(o.valor).toFixed(2)) + f('58', 'BR') + f('59', norm(o.nome, 25)) + f('60', norm(o.cidade, 15)) +
    f('62', f('05', String(o.txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***')) + '6304';
  return p + crc16(p);
}
/* QR Code: biblioteca carregada só quando o leitor chega ao pagamento; se não carregar, o código copia-e-cola continua valendo */
function drawQR(text, box, onFail) {
  const fail = () => { box.remove(); if (onFail) onFail(); };
  const go = () => {
    try {
      const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
      const n = qr.getModuleCount(), q = 3; let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q},${r + q}h1v1h-1z`;
      box.innerHTML = `<svg viewBox="0 0 ${n + q * 2} ${n + q * 2}" shape-rendering="crispEdges" role="img" aria-label="QR Code Pix"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
    } catch (e) { fail(); }
  };
  if (window.qrcode) return go();
  const srcs = ['https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js', 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'];
  const load = i => {
    if (i >= srcs.length) return fail();
    const sc = document.createElement('script'); sc.src = srcs[i]; sc.onload = () => window.qrcode ? go() : load(i + 1); sc.onerror = () => load(i + 1); document.head.appendChild(sc);
  };
  load(0);
}

/* Botão "Assine": escolha do plano -> pagamento por Pix */
function openSubscribe(plano) {
  if (document.querySelector('.sub-modal')) return;
  const P = SITE.plans, eco = P.mensal.preco * 12 - P.anual.preco, mes = (P.anual.preco / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const m = document.createElement('div'); m.className = 'sub-modal';
  const card = html => { m.innerHTML = `<div class="sub-card" role="dialog" aria-modal="true" aria-label="Assinar a Fuzion Insights"><button class="sub-x" aria-label="Fechar">×</button>${html}</div>`; m.querySelector('.sub-x').onclick = close; };
  const onKey = e => { if (e.key === 'Escape') close(); };
  const close = () => { m.remove(); document.removeEventListener('keydown', onKey); };
  m.addEventListener('click', e => { if (e.target === m) close(); });
  document.addEventListener('keydown', onKey);

  /* Passo 1 — plano e e-mail */
  const step1 = () => {
    card(`<h3>Assine a Fuzion Insights</h3><p>Apoie a redação independente e receba o Fuzion Briefing semanal.</p>
    <form>
      <div class="plans">
        <label class="plan"><input type="radio" name="plano" value="mensal"><span class="pn">Mensal</span><span class="pp">R$ ${P.mensal.preco}<small>/mês</small></span><span class="ps">Cancele quando quiser</span></label>
        <label class="plan sel"><input type="radio" name="plano" value="anual" checked><span class="tag">Melhor valor</span><span class="pn">Anual</span><span class="pp">R$ ${P.anual.preco}<small>/ano</small></span><span class="ps">R$ ${mes}/mês · economize R$ ${eco}</span></label>
      </div>
      ${SITE.autoPay ? '<div class="auto-box" hidden><button type="button" class="btn auto-pay">Pagar com cartão ou Pix · ativação automática</button><p class="auto-note">Você entra com sua conta e o acesso é liberado sozinho quando o pagamento é aprovado.</p><div class="fz-or"><span>ou pague por Pix manual</span></div></div>' : ''}
      <input type="email" placeholder="Seu melhor e-mail" required aria-label="E-mail">
      <button class="btn" type="submit">Continuar para o pagamento</button>
    </form>
    <a class="sub-free" tabindex="0" role="button">Prefiro apenas a newsletter gratuita</a>
    <a class="sub-login" href="/acesso.html">Já sou assinante: entrar</a>`);
    const form = m.querySelector('form'), mail = () => form.querySelector('input[type="email"]');
    form.addEventListener('change', () => m.querySelectorAll('.plan').forEach(p => p.classList.toggle('sel', p.querySelector('input').checked)));
    form.onsubmit = e => {
      e.preventDefault();
      const plano = form.plano.value, email = mail().value.trim(), ref = makeRef(), btn = form.querySelector('button'); btn.disabled = true;
      saveSubscriber(email, plano, { ref, status: 'aguardando pagamento' }).then(() => step2(plano, email, ref))
        .catch(() => { btn.disabled = false; toast('Não foi possível concluir agora. Tente novamente.'); });
    };
    const ap = m.querySelector('.auto-pay');
    if (ap) {   // só mostra o pagamento automático se o Mercado Pago já estiver configurado no Netlify
      (window.FZ_AUTOPAY = window.FZ_AUTOPAY || fetch('/api/checkout').then(r => r.json()).then(d => !!d.ativo).catch(() => false)).then(on => {
        if (!on) return; m.querySelector('.auto-box').hidden = false;
        const sb = m.querySelector('form button[type="submit"]'); if (sb) { sb.classList.add('ghost'); sb.textContent = 'Continuar para o pagamento por Pix manual'; }
      });
    }
    if (ap) ap.onclick = async () => {
      ap.disabled = true;
      let tk = await FZAuth.token(); if (!tk) { const u = await FZAuth.open(); if (!u) { ap.disabled = false; return; } tk = await FZAuth.token(); }
      try {
        const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plano: form.plano.value, token: tk }) });
        const d = await r.json().catch(() => ({}));
        if (d.ok && d.url) { location.href = d.url; return; }
        toast(d.erro === 'verificar' ? 'Confirme seu e-mail (enviamos um link) e tente de novo.' : d.erro === 'configuracao' ? 'O pagamento automático ainda não está disponível. Use o Pix manual.' : 'Não foi possível iniciar o pagamento agora.');
      } catch (e) { toast('Sem conexão. Tente novamente.'); }
      ap.disabled = false;
    };
    m.querySelector('.sub-free').onclick = () => {
      if (!mail().reportValidity()) return;
      saveSubscriber(mail().value.trim(), 'gratuito').then(() => { toast('E-mail cadastrado na Fuzion Insights!'); close(); }).catch(() => toast('Não foi possível cadastrar agora.'));
    };
    if (plano === 'mensal' || plano === 'anual') { form.querySelector(`input[value=${plano}]`).checked = true; form.dispatchEvent(new Event('change')); }
    mail().focus();
  };

  /* Passo 2 — pagamento */
  const step2 = (plano, email, ref) => {
    const pl = P[plano], payload = pixPayload({ chave: SITE.pix.chave, nome: SITE.pix.nome, cidade: SITE.pix.cidade, valor: pl.preco, txid: ref });
    const ppUrl = SITE.paypal ? `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(SITE.email)}&item_name=${encodeURIComponent('Fuzion Insights - plano ' + pl.nome)}&item_number=${ref}&amount=${pl.preco.toFixed(2)}&currency_code=BRL&no_shipping=1` : '';
    const alt = [pl.checkout && `<a class="btn ghost" href="${esc(pl.checkout)}" target="_blank" rel="noopener">Pagar com cartão</a>`, ppUrl && `<a class="btn ghost" href="${esc(ppUrl)}" target="_blank" rel="noopener">Pagar com PayPal</a>`].filter(Boolean).join('');
    card(`<h3>Pague com Pix</h3>
      <p class="pay-sum"><strong>Plano ${esc(pl.nome)}</strong> · ${brl(pl.preco)}</p>
      <div class="pix-qr" id="pix-qr" aria-live="polite"></div>
      <p class="pix-help">Abra o app do seu banco, escolha Pix e leia o QR Code, ou use o código copia e cola.</p>
      <button type="button" class="btn" id="pix-copy">Copiar código Pix</button>
      <div class="pix-key"><span>Chave Pix (e-mail)</span><b>${esc(SITE.pix.chave)}</b><button type="button" id="pix-key-copy">Copiar</button></div>
      <p class="pix-ref">Código do pedido: <b>${ref}</b></p>
      ${alt ? `<div class="pay-alt">${alt}</div>` : ''}
      <button type="button" class="btn ghost" id="pix-paid">Já fiz o pagamento</button>
      <p class="pix-note">Depois de pagar, clique no botão acima. Confirmamos por e-mail em até 1 dia útil.</p>`);
    drawQR(payload, m.querySelector('#pix-qr'), () => { const h = m.querySelector('.pix-help'); if (h) h.textContent = 'Abra o app do seu banco, escolha Pix e use o código copia e cola (ou a chave abaixo).'; });
    m.querySelector('#pix-copy').onclick = () => copyText(payload, 'Código Pix copiado!');
    m.querySelector('#pix-key-copy').onclick = () => copyText(SITE.pix.chave, 'Chave Pix copiada!');
    m.querySelector('#pix-paid').onclick = e => {
      e.target.disabled = true;
      notifyEmail(`Pagamento informado (${pl.nome} · ${brl(pl.preco)})`, { email, plano, valor: brl(pl.preco), referencia: ref, status: 'cliente informou que pagou via Pix' });
      card(`<h3>Obrigado!</h3><p>Recebemos o aviso do seu pagamento. Assim que o Pix for confirmado, enviamos o <strong>código de acesso</strong> para <strong>${esc(email)}</strong>. Com ele você entra na <a href="/acesso.html">área do assinante</a>.</p>
        <p class="pix-note">Se quiser agilizar, envie o comprovante para <a href="mailto:${SITE.email}?subject=${encodeURIComponent('Comprovante Pix ' + ref)}">${SITE.email}</a> citando o código <b>${ref}</b>.</p>
        <button type="button" class="btn" id="pix-close">Fechar</button>`);
      m.querySelector('#pix-close').onclick = close;
    };
  };

  step1(); document.body.appendChild(m);
}

/* Altura do header fixo -> usada pela barra de estilo do editor */
function trackHeader() {
  const h = document.querySelector('.top-fixed') || document.querySelector('.site-header'); if (!h) return;
  const set = () => document.documentElement.style.setProperty('--hdr-h', getComputedStyle(h).position === 'sticky' ? h.offsetHeight + 'px' : '0px');
  set(); window.addEventListener('resize', set);
  if (window.ResizeObserver) new ResizeObserver(set).observe(h);
}

document.addEventListener('DOMContentLoaded', () => {
  mountHeader();
  document.querySelectorAll('[data-year]').forEach(e => e.textContent = new Date().getFullYear());
  document.querySelectorAll('[data-cookie-prefs]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); cookieBanner(true); }));
  const membro = Member.get();
  document.querySelectorAll('[data-subscribe]').forEach(b => {
    if (b.classList.contains('btn-sub')) b.textContent = membro ? 'Minha área' : SITE.botao;
    b.addEventListener('click', () => membro && b.classList.contains('btn-sub') ? (location.href = '/acesso.html') : openSubscribe());
  });
  document.querySelectorAll('.f-links').forEach(n => { if (!n.querySelector('[href$="acesso.html"]')) n.insertAdjacentHTML('beforeend', '<a href="/assine.html">Assinar</a><a href="/acesso.html">Área do assinante</a>'); });
  if (Admin.token) setInterval(() => Admin.fresh(), 5 * 60 * 1000);
  cookieBanner(); trackHeader(); initAds(); fMkt(); setInterval(fMkt, 60000);
});


/* ===== Área de membro: entrar com Google ou e-mail (Firebase Authentication) =====
   A conta gratuita é só o login. O plano PAGO fica em /ativos (por e-mail); quem entra com o e-mail da assinatura
   recebe o conteúdo exclusivo pela função /premium, que confere o login no servidor. O SDK só é baixado quando precisa. */
const FZAuth = (() => {
  const V = '10.14.1', CFG = { apiKey: SITE.firebaseKey, authDomain: 'fuzion-insights.firebaseapp.com', projectId: 'fuzion-insights' };
  let auth = null, loading = null, user = null, plan = null; const subs = [];
  const flag = v => { try { v === undefined ? (v = localStorage.getItem('fz_auth')) : (v ? localStorage.setItem('fz_auth', '1') : localStorage.removeItem('fz_auth')); return v; } catch (e) {} };
  const js = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  function sdk() {   // uma única carga: quem chama depois espera o login ser restaurado (evita ler "sem usuário" cedo demais)
    return loading || (loading = (async () => {
      await js(`https://www.gstatic.com/firebasejs/${V}/firebase-app-compat.js`); await js(`https://www.gstatic.com/firebasejs/${V}/firebase-auth-compat.js`);
      auth = firebase.initializeApp(CFG, 'fz-membro').auth(); auth.languageCode = 'pt-BR';
      await new Promise(res => { let first = true; auth.onAuthStateChanged(u => { user = u; plan = null; if (u) flag(true); paint(); subs.forEach(f => f(u)); if (first) { first = false; res(); } }); });
      return auth;
    })().catch(e => { loading = null; throw e; }));
  }
  const ready = () => (flag() ? sdk().catch(() => null) : Promise.resolve(null));
  async function token() {
    await ready(); if (!user) return null;
    if (!user.emailVerified) { try { await user.reload(); } catch (e) {} if (user.emailVerified) return user.getIdToken(true); }
    return user.getIdToken();
  }
  async function status() {           // { ok, plano, ate } se for assinante; { ok:false, erro } se não
    if (plan) return plan; const t = await token(); if (!t) return { ok: false, erro: 'login' };
    plan = await Member.checkToken(t, ''); return plan;
  }
  function paint() {
    const b = document.getElementById('hd-user'); if (!b) return;
    const ini = ((user && (user.displayName || user.email)) || '?').trim().charAt(0).toUpperCase();
    b.classList.toggle('on', !!user); b.title = user ? 'Minha conta' : 'Entrar / criar conta';
    b.innerHTML = user ? (user.photoURL ? `<img src="${esc(user.photoURL)}" alt="" referrerpolicy="no-referrer">` : `<b>${esc(ini)}</b>`) : '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';
    if (user) status().then(p => { b.classList.toggle('paid', !!p.ok); });
  }
  const ERR = { 'auth/invalid-credential': 'E-mail ou senha incorretos.', 'auth/wrong-password': 'E-mail ou senha incorretos.', 'auth/user-not-found': 'E-mail ou senha incorretos.', 'auth/invalid-email': 'Digite um e-mail válido.', 'auth/email-already-in-use': 'Este e-mail já tem conta. Use “Entrar”.', 'auth/weak-password': 'Use uma senha com pelo menos 6 caracteres.', 'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.', 'auth/network-request-failed': 'Sem conexão. Tente novamente.', 'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere pop-ups para este site.', 'auth/unauthorized-domain': 'Este endereço ainda não foi liberado no Firebase (Authentication → Configurações → Domínios autorizados).', 'auth/operation-not-allowed': 'Este método de login ainda não foi ativado no Firebase (Authentication → Método de login).' };
  const G = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';
  function open() {
    return new Promise(done => {
      if (document.getElementById('fz-login')) return done(null);
      const m = document.createElement('div'); m.className = 'sub-modal'; m.id = 'fz-login';
      m.innerHTML = `<div class="sub-card fz-card" role="dialog" aria-modal="true" aria-labelledby="fz-t"><button class="sub-x" aria-label="Fechar" type="button">×</button>
        <h3 id="fz-t">Entre na Fuzion Insights</h3><p>Crie sua conta gratuita ou entre para ler o conteúdo exclusivo de assinante.</p>
        <button type="button" class="fz-google">${G}<span>Continuar com Google</span></button>
        <div class="fz-or"><span>ou com e-mail</span></div>
        <form novalidate><input type="email" id="fz-e" placeholder="Seu e-mail" autocomplete="email" required><input type="password" id="fz-p" placeholder="Senha (mínimo 6 caracteres)" autocomplete="current-password" minlength="6" required>
          <div class="fz-row"><button class="btn" type="submit">Entrar</button><button class="btn ghost fz-new" type="button">Criar conta gratuita</button></div><a class="fz-forgot" tabindex="0" role="button">Esqueci minha senha</a></form>
        <p class="fz-msg" role="status"></p>
        <p class="fz-note">Conta gratuita: comente e acompanhe as análises abertas. Conteúdo exclusivo: só para assinantes. Ao continuar você concorda com os <a href="/termos.html">Termos</a> e a <a href="/privacidade.html">Privacidade</a>.</p></div>`;
      const msg = (t, ok) => { const e = m.querySelector('.fz-msg'); e.style.color = ok ? '#166534' : '#B91C1C'; e.textContent = t || ''; };
      let finished = false; const end = u => { if (finished) return; finished = true; m.remove(); document.removeEventListener('keydown', key); done(u); };
      const key = e => { if (e.key === 'Escape') end(null); }; document.addEventListener('keydown', key);
      m.addEventListener('click', e => { if (e.target === m) end(null); }); m.querySelector('.sub-x').onclick = () => end(null);
      const run = async fn => { msg('Aguarde…', true); m.querySelectorAll('button').forEach(b => b.disabled = true);
        try { const a = await sdk(); const u = await fn(a); if (u) { toast('Bem-vindo(a)' + (u.displayName ? ', ' + u.displayName.split(' ')[0] : '') + '!'); end(u); return; } }
        catch (e) { if (e && e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') msg(ERR[e && e.code] || 'Não foi possível entrar agora. Tente novamente.'); else msg(''); }
        m.querySelectorAll('button').forEach(b => b.disabled = false); };
      const cred = () => [m.querySelector('#fz-e').value.trim(), m.querySelector('#fz-p').value];
      m.querySelector('.fz-google').onclick = () => run(async a => (await a.signInWithPopup(new firebase.auth.GoogleAuthProvider())).user);
      m.querySelector('form').onsubmit = e => { e.preventDefault(); run(async a => (await a.signInWithEmailAndPassword(...cred())).user); };
      m.querySelector('.fz-new').onclick = () => run(async a => { const c = await a.createUserWithEmailAndPassword(...cred()); try { await c.user.sendEmailVerification(); } catch (e) {} toast('Conta criada! Enviamos um link de confirmação para o seu e-mail.'); return c.user; });
      m.querySelector('.fz-forgot').onclick = async () => { const [e] = cred(); if (!e) { msg('Digite o e-mail e clique de novo.'); return; } try { await (await sdk()).sendPasswordResetEmail(e); msg('Enviamos o link para redefinir a senha.', true); } catch (x) { msg(ERR[x && x.code] || 'Não foi possível enviar agora.'); } };
      document.body.appendChild(m); m.querySelector('#fz-e').focus();
    });
  }
  function menu() {
    const old = document.getElementById('umenu'); if (old) { old.remove(); return; }
    const h = document.querySelector('.site-header'); if (!h) return;
    const d = document.createElement('div'); d.id = 'umenu'; d.className = 'umenu';
    d.innerHTML = `<div class="um-who"><b>${esc(user.displayName || 'Minha conta')}</b><span>${esc(user.email || '')}</span></div><div class="um-plan" id="um-plan">Verificando plano…</div><nav><a href="/?secao=exclusivos">🔒 Conteúdo exclusivo</a><a href="/acesso.html">Área do assinante</a><button type="button" id="um-sub">Assinar / renovar</button><button type="button" id="um-out">Sair</button></nav>`;
    h.appendChild(d);
    status().then(p => { const e = d.querySelector('#um-plan'); if (!e) return;
      e.className = 'um-plan ' + (p.ok ? 'paid' : '');
      e.innerHTML = p.ok ? `Assinante · acesso até ${esc(String(p.ate || '').split('-').reverse().join('/'))}` : (p.erro === 'verificar' ? 'Confirme seu e-mail para liberar o acesso. <a id="um-re">Reenviar link</a>' : 'Plano gratuito'); const re = d.querySelector('#um-re'); if (re) re.onclick = async () => { try { await user.sendEmailVerification(); toast('Link de confirmação enviado.'); } catch (x) { toast('Aguarde um pouco para pedir de novo.'); } }; });
    d.querySelector('#um-sub').onclick = () => { d.remove(); openSubscribe(); };
    d.querySelector('#um-out').onclick = async () => { d.remove(); await signOut(); toast('Você saiu da conta.'); if (/^\/(artigo\/|acesso)/.test(location.pathname)) location.reload(); };
    setTimeout(() => document.addEventListener('click', function f(e) { if (!d.contains(e.target)) { d.remove(); document.removeEventListener('click', f); } }), 0);
  }
  function click() { if (user) { menu(); return; } ready().then(() => user ? menu() : open().then(u => { if (u && /^\/(artigo\/|acesso)/.test(location.pathname)) location.reload(); })); }
  function init() { const b = document.getElementById('hd-user'); if (!b) return; b.addEventListener('click', e => { e.stopPropagation(); click(); }); paint(); if (flag()) sdk().catch(() => {}); }
  async function signOut() { if (auth) await auth.signOut(); flag(false); plan = null; paint(); }
  return { open, token, status, ready, init, signOut, onChange: f => { subs.push(f); if (auth) f(user); }, get user() { return user; } };
})();

/* ===== Seções, subcategorias e cores (cabeçalho, filtros, painel e cards usam esta lista) ===== */
const SECTIONS = [
  { n: 'Economia', c: '#EAB308', d: '#A16207', t: '#111', s: ['Câmbio e Juros', 'Inflação', 'Indicadores', 'Contas Públicas', 'Comércio Exterior'] },
  { n: 'Mercado', c: '#D97706', s: ['Bolsa e Ações', 'Renda Fixa', 'Fundos e ETFs', 'Criptomoedas', 'Commodities'] },
  { n: 'Negócios', c: '#1D4ED8', s: ['Empreendedorismo', 'Finanças da Empresa', 'Marketing e Vendas', 'Carreira', 'Setores'] },
  { n: 'Estratégia', c: '#4338CA', s: ['Planejamento', 'Inovação', 'Tendências', 'Concorrência'] },
  { n: 'Liderança', c: '#7C3AED', s: ['Gestão de Pessoas', 'Cultura', 'Tomada de Decisão', 'Produtividade'] },
  { n: 'Tecnologia', c: '#0891B2', s: ['Inteligência Artificial', 'Cibersegurança', 'Startups', 'Software e Nuvem', 'Gadgets'] },
  { n: 'Ciência', c: '#0D9488', s: ['Saúde', 'Espaço', 'Pesquisa e Descobertas', 'Física e Química'] },
  { n: 'Meio Ambiente', c: '#16A34A', d: '#15803D', s: ['Clima', 'Sustentabilidade', 'Energia Limpa', 'Biodiversidade', 'Água e Saneamento'] },
  { n: 'Política', c: '#B91C1C', s: ['Eleições', 'Governo', 'Congresso', 'Mundo'] },
  { n: 'Cidade', c: '#475569', s: ['Brasília e DF', 'Mobilidade', 'Serviços', 'Meio Ambiente Urbano', 'Segurança'] },
  { n: 'Entretenimento', c: '#E11D48', s: ['Cinema e TV', 'Música', 'Games', 'Celebridades', 'Esportes'] },
  { n: 'Arte e Cultura', c: '#A21CAF', s: ['Artes Visuais', 'Livros', 'Teatro e Dança', 'Design e Arquitetura', 'Patrimônio'] },
  { n: 'Social', c: '#4D7C0F', s: ['Educação', 'Comportamento', 'Trabalho e Renda', 'Direitos e Cidadania', 'Consumo'] }
];
// abas que aparecem sempre na barra; as demais ficam no menu ☰ (todas as seções)
const PRIMARY = ['Economia', 'Mercado', 'Negócios', 'Tecnologia', 'Ciência', 'Meio Ambiente', 'Liderança', 'Cidade', 'Entretenimento', 'Arte e Cultura', 'Social'];
const secOf = n => SECTIONS.find(x => x.n === n) || {};
const secColor = n => secOf(n).c || '#2F80ED', secText = n => secOf(n).d || secColor(n);
const secStyle = n => `--c:${secColor(n)};--cd:${secText(n)};--tc:${secOf(n).t || '#fff'}`;
const secLink = (n, sub) => '/?secao=' + slugify(n) + (sub ? '&sub=' + slugify(sub) : '');

function mountHeader() {
  const h = document.querySelector('.site-header'); if (!h || h.dataset.v3) return; h.dataset.v3 = '1';
  const tab = n => `<a href="${secLink(n)}" data-sec="${esc(n)}" style="${secStyle(n)}">${esc(n)}</a>`;
  const mega = SECTIONS.map(s => `<div class="mg-col" style="${secStyle(s.n)}"><a class="mg-h" href="${secLink(s.n)}" data-sec="${esc(s.n)}">${esc(s.n)}</a>${s.s.map(x => `<a href="${secLink(s.n, x)}" data-sec="${esc(s.n)}" data-sub="${esc(x)}">${esc(x)}</a>`).join('')}</div>`).join('');
  h.innerHTML = `<div class="hd-bar"><a class="logo-sq" href="/" aria-label="Fuzion Insights — página inicial"><img src="/logo-quadrado.png" alt="Fuzion Insights" width="56" height="56"></a>`
    + `<nav class="hd-tabs" aria-label="Seções">${PRIMARY.map(n => tab(n)).join('')}</nav>`
    + `<div class="hd-right"><button type="button" class="btn-sub" data-subscribe>Assine</button><button type="button" class="hd-user" id="hd-user" aria-label="Área de membro" aria-haspopup="true"></button>`
    + `<button type="button" class="hd-burger" aria-label="Todas as seções" aria-expanded="false" aria-controls="mega"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></div></div>`
    + `<div class="hd-sub" id="subbar" hidden></div>`
    + `<div class="mega" id="mega" hidden><div class="wrap mg-in">${mega}<div class="mg-col" style="--c:#2F80ED;--cd:#1D4ED8"><a class="mg-h" href="/?secao=exclusivos" data-sec="Exclusivos">🔒 Exclusivos</a><a href="/assine.html">Planos de assinatura</a><a href="/acesso.html">Área do assinante</a><a href="/sobre.html">Sobre</a><a href="/contato.html">Contato</a></div></div></div>`;
  const burger = h.querySelector('.hd-burger'), mg = h.querySelector('#mega');
  const close = () => { mg.hidden = true; burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', e => { e.stopPropagation(); const open = mg.hidden; mg.hidden = !open; burger.setAttribute('aria-expanded', String(open)); });
  document.addEventListener('click', e => { if (!mg.hidden && !mg.contains(e.target)) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  h.addEventListener('click', e => {
    const a = e.target.closest('a[data-sec]'); if (!a) return; close();
    if (window.FZ_HOME && window.st) { e.preventDefault(); window.st(a.dataset.sec, a.dataset.sub || ''); }
  });
  setNav(window.FZ_SEC || 'Home', '');
  FZAuth.init();
}
/* marca a aba ativa e mostra as subcategorias da seção */
function setNav(name, sub) {
  document.querySelectorAll('.hd-tabs a').forEach(a => a.classList.toggle('active', a.dataset.sec === name));
  const bar = document.getElementById('subbar'); if (!bar) return;
  const s = SECTIONS.find(x => x.n === name);
  if (!s) { bar.hidden = true; bar.innerHTML = ''; return; }
  bar.style.cssText = secStyle(s.n); bar.hidden = false;
  bar.innerHTML = `<div class="wrap hd-sub-in"><span class="sb-t">${esc(s.n)}</span><a href="${secLink(s.n)}" data-sec="${esc(s.n)}" class="${sub ? '' : 'on'}">Todas</a>${s.s.map(x => `<a href="${secLink(s.n, x)}" data-sec="${esc(s.n)}" data-sub="${esc(x)}" class="${sub === x ? 'on' : ''}">${esc(x)}</a>`).join('')}</div>`;
}

/* ===== Capas inteiras (sem corte): imagem “contida” sobre fundo desfocado da própria capa ===== */
function coverHTML(a, cls, eager) {
  const u = a.image;
  if (!u) return `<span class="cv cv-none ${cls || ''}"><b>${esc(a.category || 'Fuzion Insights')}</b></span>`;
  return `<span class="cv ${cls || ''}" style="--bg:url('${esc(u)}')"><img src="${esc(u)}" alt="${esc(a.imageCaption || a.title)}" ${eager ? '' : 'loading="lazy" '}decoding="async"></span>`;
}

/* ===== Lista leve de artigos (/lista no Firebase) =====
   /artigos guarda o texto completo e a capa em base64 de CADA matéria; baixar tudo a cada visita estoura a cota do
   Firebase e a home fica vazia. /lista tem só título, resumo, tags etc. (poucos KB) e a capa vem de /img/ID (cache do Netlify). */
const LKEY = 'fz_lista_v2';
window.FZ_TV = (() => { try { return JSON.parse(localStorage.getItem('fz_tv') || 'null'); } catch (e) { return null; } })();
const plainTxt = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
function liteOf(a) { const { content, image, og, ...r } = a; r.hasImg = !!image; r.iv = image ? image.length : 0; r.txt = plainTxt(content).slice(0, 500); return r; }
function normLite(map) {
  const o = {};
  Object.keys(map || {}).forEach(k => {
    const x = map[k]; if (!x || typeof x !== 'object' || !x.title) return;
    const y = Object.assign({}, x);
    if ('hasImg' in y) y.image = y.hasImg ? `/img/${encodeURIComponent(y.id)}?c=1&v=${y.iv || 0}` : '';
    o[k] = y;
  });
  return o;
}
async function loadLista() {
  const get = async u => { const r = await fetch(u); if (!r.ok) throw 0; return r.json(); };
  let d = null; try { d = await get(`${SITE.db}/lista.json`); } catch (e) {}
  if (!d || d.error || !Object.keys(d).length) {          // ainda sem /lista: usa o método antigo (mais pesado)
    const f = await get(`${SITE.db}/artigos.json`); if (!f || f.error) throw 0;
    d = {}; Object.keys(f).forEach(k => { d[k] = liteOf(f[k]); });
  }
  window.FZ_TV = d._tv || null; try { localStorage.setItem('fz_tv', JSON.stringify(window.FZ_TV)); } catch (e) {}
  const m = normLite(d); try { localStorage.setItem(LKEY, JSON.stringify(m)); } catch (e) {}
  return m;
}
const cachedLista = () => { try { return JSON.parse(localStorage.getItem(LKEY) || 'null') || {}; } catch (e) { return {}; } };

/* ===== Blocos HTML incorporados (gráficos, quadros, linhas do tempo…) =====
   O código fica guardado em base64 num <figure class="fz-embed"> e só é executado dentro de um
   iframe isolado (sandbox sem allow-same-origin): ele não enxerga o site, o login nem o armazenamento. */
const fzB64 = {
  enc: s => btoa(unescape(encodeURIComponent(s))),
  dec: b => { try { return decodeURIComponent(escape(atob(b))); } catch (e) { return ''; } }
};
function fzEmbedDoc(code, id) {
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank">'
    + '<style>*{box-sizing:border-box}html,body{margin:0;padding:0;background:transparent}body{font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1A1A1E;line-height:1.5;overflow-y:hidden}img,svg,canvas,video{max-width:100%}</style></head>'
    + '<body><div id="fz-root">' + code + '</div><script>(function(){var id=' + JSON.stringify(id) + ',r=document.getElementById("fz-root");'
    + 'function s(){var h=Math.ceil(r.getBoundingClientRect().height)+2;parent.postMessage({fzEmbed:id,h:h},"*")}'
    + 'addEventListener("load",s);if(window.ResizeObserver)new ResizeObserver(s).observe(r);setInterval(s,800);s()})()<\/script></body></html>';
}
function hydrateEmbeds(root, opt) {
  opt = opt || {};
  (root || document).querySelectorAll('figure.fz-embed').forEach(f => {
    if (f.querySelector('iframe')) return;
    [...f.childNodes].forEach(c => { if (c.nodeType === 3) c.remove(); });
    f.querySelectorAll('.fz-tools').forEach(x => x.remove());
    const code = fzB64.dec(f.getAttribute('data-fz') || ''); if (!code) return;
    const id = 'fz' + Math.random().toString(36).slice(2, 10), fixed = parseInt(f.getAttribute('data-h'), 10);
    const ifr = document.createElement('iframe');
    ifr.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
    ifr.setAttribute('referrerpolicy', 'no-referrer'); ifr.setAttribute('loading', 'lazy');
    ifr.setAttribute('title', f.getAttribute('data-t') || 'Conteúdo interativo'); ifr.dataset.fzid = id;
    if (fixed >= 80 && fixed <= 2000) { ifr.style.height = fixed + 'px'; ifr.dataset.fixed = '1'; } else ifr.style.height = '240px';
    ifr.srcdoc = fzEmbedDoc(code, id);
    f.appendChild(ifr);
    if (opt.editor) {
      f.setAttribute('contenteditable', 'false'); f.dataset.label = f.getAttribute('data-t') || 'Bloco HTML';
      const t = document.createElement('div'); t.className = 'fz-tools'; t.contentEditable = 'false';
      t.innerHTML = '<button type="button" data-fz-act="edit" data-label="Editar"></button><button type="button" data-fz-act="del" data-label="Remover"></button>';
      f.appendChild(t);
    }
  });
}
window.addEventListener('message', e => {
  const d = e.data; if (!d || typeof d.fzEmbed !== 'string' || typeof d.h !== 'number') return;
  const f = document.querySelector('iframe[data-fzid="' + String(d.fzEmbed).replace(/[^\w]/g, '') + '"]');
  if (!f || f.contentWindow !== e.source || f.dataset.fixed) return;
  f.style.height = Math.min(2000, Math.max(60, d.h)) + 'px';
});
