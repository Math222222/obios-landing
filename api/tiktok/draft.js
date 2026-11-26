// Envoie un carrousel photo dans les BROUILLONS TikTok (jamais de publication). Protégé par TIKTOK_ADMIN_KEY (en-tête x-admin-key).
// Corps JSON : { title, description, images: ["https://www.obios.fr/p/..."] }
const SB = () => ({ url: process.env.SUPABASE_URL, h: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' } });

async function token() {
  const { url, h } = SB();
  const r = await (await fetch(`${url}/rest/v1/tiktok_tokens?select=*&limit=1`, { headers: h })).json();
  let t = r[0]; if (!t) throw new Error('aucun compte connecté');
  if (new Date(t.access_expires_at).getTime() > Date.now() + 120000) return t;
  const n = await (await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY, client_secret: process.env.TIKTOK_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: t.refresh_token }),
  })).json();
  if (!n.access_token) throw new Error('rafraîchissement du jeton refusé');
  t = { ...t, access_token: n.access_token, refresh_token: n.refresh_token || t.refresh_token,
    access_expires_at: new Date(Date.now() + n.expires_in * 1000).toISOString(), updated_at: new Date().toISOString() };
  await fetch(`${url}/rest/v1/tiktok_tokens?on_conflict=open_id`, { method: 'POST', headers: { ...h, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(t) });
  return t;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST' || req.headers['x-admin-key'] !== process.env.TIKTOK_ADMIN_KEY || !process.env.TIKTOK_ADMIN_KEY) return res.status(401).json({ error: 'non autorisé' });
  try {
    const { title, description, images } = req.body || {};
    if (!Array.isArray(images) || !images.length || images.some((u) => !String(u).startsWith('https://www.obios.fr/'))) return res.status(400).json({ error: 'images : URLs https://www.obios.fr/ requises' });
    const t = await token();
    const r = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
      method: 'POST', headers: { Authorization: `Bearer ${t.access_token}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ post_info: { title: (title || '').slice(0, 90), description: description || '' }, source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: images }, post_mode: 'MEDIA_UPLOAD', media_type: 'PHOTO' }),
    });
    return res.status(r.status).json(await r.json());
  } catch (e) { return res.status(500).json({ error: String(e.message || e) }); }
};
