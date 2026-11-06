// Imagem de um item da comunidade (guardada em base64 no Firebase) entregue como JPEG normal: /ci/<id>.jpg
const DB = 'https://fuzion-insights-default-rtdb.firebaseio.com';
const KEY = process.env.FB_API_KEY || 'AIzaSyCwWE9YtckCT--utTkRJAqxk1_HWu0EJlM';
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
  const id = String((event.queryStringParameters || {}).id || '').replace(/\.jpe?g$/i, '').trim();
  if (!/^[0-9a-z]{9,14}$/.test(id)) return { statusCode: 404, body: 'Not found' };
  try {
    const t = await adminToken();
    const v = await (await fetch(`${DB}/comunidade/imagens/${id}.json?auth=${t}`)).json();
    const m = typeof v === 'string' && /^data:image\/jpeg;base64,(.+)$/s.exec(v);
    if (!m) return { statusCode: 404, body: 'Not found' };
    // o código do item é único e a imagem não muda: pode ficar em cache por muito tempo
    return { statusCode: 200, isBase64Encoded: true, headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400, s-maxage=2592000, immutable' }, body: m[1] };
  } catch (e) { return { statusCode: 500, body: 'Error' }; }
};
