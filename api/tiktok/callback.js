// Retour de connexion TikTok (Login Kit) : échange le code contre un jeton et le range dans Supabase (table tiktok_tokens, accès serveur uniquement).
// Variables Vercel : TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
module.exports = async (req, res) => {
  const { code, error } = req.query || {};
  const page = (msg) => res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:system-ui;padding:40px;text-align:center"><h2>${msg}</h2>`);
  if (error || !code) return page('Connexion annulée.');
  try {
    const r = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY, client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code, grant_type: 'authorization_code', redirect_uri: 'https://www.obios.fr/api/tiktok/callback',
      }),
    });
    const t = await r.json();
    if (!t.access_token) return page('Échec de la connexion TikTok.');
    const row = {
      open_id: t.open_id, access_token: t.access_token, refresh_token: t.refresh_token, scope: t.scope,
      access_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
      refresh_expires_at: new Date(Date.now() + t.refresh_expires_in * 1000).toISOString(), updated_at: new Date().toISOString(),
    };
    const s = await fetch(`${process.env.SUPABASE_URL}/rest/v1/tiktok_tokens?on_conflict=open_id`, {
      method: 'POST',
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(row),
    });
    if (!s.ok) { const b = (await s.text()).slice(0, 200); console.error('supabase', s.status, b); return page('Connecté à TikTok, mais enregistrement impossible (' + s.status + ') ' + b.replace(/[<>&]/g, '')); }
    return page('Compte TikTok connecté ✅ Tu peux fermer cette page.');
  } catch (e) { return page('Erreur serveur.'); }
};
