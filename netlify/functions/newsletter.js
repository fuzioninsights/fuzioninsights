// Envia cada novo inscrito da newsletter para a lista da Brevo (plano gratuito), sem você copiar e colar nada.
// Variáveis no Netlify (Site configuration > Environment variables):
//   BREVO_API_KEY          chave de API da Brevo (SMTP e API > Chaves de API)
//   BREVO_LIST_ID          número da lista de contatos (Contatos > Listas)
//   BREVO_DOI_TEMPLATE_ID  (opcional, recomendado) número do modelo de e-mail de confirmação "double opt-in".
//                          Com ele, o leitor precisa clicar para confirmar, o que evita cadastros de e-mails alheios.
// Se as variáveis não existirem, esta função apenas responde 503 e o site continua funcionando normalmente.
const H = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const out = (code, obj) => ({ statusCode: code, headers: H, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return out(405, { ok: false });
  const site = (process.env.URL || 'https://fuzioninsights.netlify.app').replace(/\/$/, '');
  const origin = event.headers && (event.headers.origin || event.headers.Origin);
  if (origin && origin.replace(/\/$/, '') !== site && !/^https?:\/\/localhost/.test(origin)) return out(403, { ok: false });

  let b; try { b = JSON.parse(event.body || '{}'); } catch (e) { return out(400, { ok: false }); }
  const email = String(b.email || '').trim().toLowerCase();
  if (b.site_url) return out(200, { ok: true });   // campo-isca: robôs preenchem, pessoas não
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return out(400, { ok: false, erro: 'email' });

  const key = process.env.BREVO_API_KEY, list = parseInt(process.env.BREVO_LIST_ID, 10);
  if (!key || !list) return out(503, { ok: false, erro: 'configuracao' });
  const tpl = parseInt(process.env.BREVO_DOI_TEMPLATE_ID, 10);
  const headers = { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' };

  try {
    const r = tpl
      ? await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', { method: 'POST', headers, body: JSON.stringify({ email, includeListIds: [list], templateId: tpl, redirectionUrl: site + '/?newsletter=confirmada' }) })
      : await fetch('https://api.brevo.com/v3/contacts', { method: 'POST', headers, body: JSON.stringify({ email, listIds: [list], updateEnabled: true }) });
    if (r.ok || r.status === 204) return out(200, { ok: true });
    return out(502, { ok: false, erro: 'brevo', status: r.status });
  } catch (e) { return out(500, { ok: false }); }
};
