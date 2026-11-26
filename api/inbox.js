// Boîte de réception de l'agent (messages Telegram de Mathieu). Protégée par TIKTOK_ADMIN_KEY (en-tête x-admin-key).
// GET  -> messages au statut « nouveau » (les plus anciens d'abord)
// POST { ids: [..] } -> les marque « traité »
module.exports = async (req, res) => {
  if (!process.env.TIKTOK_ADMIN_KEY || req.headers['x-admin-key'] !== process.env.TIKTOK_ADMIN_KEY) return res.status(401).json({ error: 'non autorisé' });
  const h = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' }, base = `${process.env.SUPABASE_URL}/rest/v1/telegram_inbox`;
  if (req.method === 'GET') {
    const r = await fetch(`${base}?status=eq.nouveau&order=id.asc&select=id,kind,text,urls,reply_to,message_id,received_at`, { headers: h });
    return res.status(r.status).json(await r.json());
  }
  if (req.method === 'POST') {
    const ids = ((req.body || {}).ids || []).filter(Number.isInteger);
    if (!ids.length) return res.status(400).json({ error: 'ids requis' });
    const r = await fetch(`${base}?id=in.(${ids.join(',')})`, { method: 'PATCH', headers: h, body: JSON.stringify({ status: 'traité' }) });
    return res.status(r.status).json({ ok: r.ok });
  }
  return res.status(405).end();
};
