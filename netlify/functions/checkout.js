// Pagamento automático (Mercado Pago: Pix, cartão, boleto). Só funciona para quem está logado com e-mail confirmado.
// O pagamento aprovado chega em /api/mp (função mp-webhook), que libera o acesso sozinha.
//
// Variáveis no Netlify (Site configuration > Environment variables):
//   MP_ACCESS_TOKEN (ou MERCADO_PAGO_ACCESS_TOKEN)   Access Token de PRODUÇÃO do Mercado Pago (Suas integrações > Credenciais)
//   PRECO_MENSAL / PRECO_ANUAL   (opcional) valores em reais; por padrão 11 e 114 (os mesmos do site.js)
const KEY = process.env.FB_API_KEY || 'AIzaSyCwWE9YtckCT--utTkRJAqxk1_HWu0EJlM';
const MPT = process.env.MP_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN;   // aceita os dois nomes de variável
const H = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const out = (code, obj) => ({ statusCode: code, headers: H, body: JSON.stringify(obj) });
const PLANOS = () => ({ mensal: { nome: 'Mensal', preco: Number(process.env.PRECO_MENSAL) || 11 }, anual: { nome: 'Anual', preco: Number(process.env.PRECO_ANUAL) || 114 } });

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') return { statusCode: 200, headers: Object.assign({}, H, { 'cache-control': 'public, max-age=60' }), body: JSON.stringify({ ok: true, ativo: !!MPT }) };   // o site só mostra o botão se isto der true
  if (event.httpMethod !== 'POST') return out(405, { ok: false, erro: 'metodo' });
  if (!MPT) return out(503, { ok: false, erro: 'configuracao' });
  let b; try { b = JSON.parse(event.body || '{}'); } catch (e) { return out(400, { ok: false, erro: 'dados' }); }
  const pl = PLANOS()[b.plano];
  if (!pl || !b.token) return out(400, { ok: false, erro: 'dados' });
  try {
    const u = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: String(b.token) })
    })).json();
    const usr = u && u.users && u.users[0];
    if (!usr || !usr.email) return out(401, { ok: false, erro: 'login' });
    if (!usr.emailVerified) return out(403, { ok: false, erro: 'verificar' });
    const email = String(usr.email).toLowerCase(), site = process.env.URL || 'https://fuzioninsights.netlify.app';
    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST', headers: { Authorization: `Bearer ${MPT}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: b.plano, title: `Fuzion Insights - plano ${pl.nome}`, quantity: 1, currency_id: 'BRL', unit_price: pl.preco }],
        payer: { email }, external_reference: `${email}|${b.plano}`, statement_descriptor: 'FUZION INSIGHTS',
        notification_url: `${site}/api/mp`, auto_return: 'approved',
        back_urls: { success: `${site}/acesso.html?pago=1`, pending: `${site}/acesso.html?pago=pendente`, failure: `${site}/assine.html` }
      })
    });
    const d = await r.json();
    if (!r.ok || !d.init_point) return out(502, { ok: false, erro: 'mercadopago' });
    return out(200, { ok: true, url: d.init_point });
  } catch (e) { return out(500, { ok: false, erro: 'servidor' }); }
};
