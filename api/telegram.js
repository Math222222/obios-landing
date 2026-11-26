// Webhook Telegram : range les messages de Mathieu (liens d'outliers, « oui », modifs) dans Supabase (table telegram_inbox) pour l'agent.
// Variables Vercel : TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_CHAT_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
module.exports = async (req, res) => {
  if (req.method !== 'POST' || req.headers['x-telegram-bot-api-secret-token'] !== process.env.TELEGRAM_WEBHOOK_SECRET || !process.env.TELEGRAM_WEBHOOK_SECRET) return res.status(401).end();
  const u = req.body || {}, m = u.message || u.edited_message;
  if (!m || String(m.chat && m.chat.id) !== String(process.env.TELEGRAM_CHAT_ID)) return res.status(200).end();   // seul Mathieu est écouté
  const text = m.text || m.caption || '';
  const urls = (text.match(/https?:\/\/\S+/g) || []);
  const row = { update_id: u.update_id, text, urls, kind: urls.length ? 'lien' : 'texte', reply_to: m.reply_to_message ? m.reply_to_message.message_id : null, message_id: m.message_id };
  const s = await fetch(`${process.env.SUPABASE_URL}/rest/v1/telegram_inbox?on_conflict=update_id`, {
    method: 'POST', headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify(row),
  });
  const ack = !s.ok ? '⚠️ Je n\'ai pas pu enregistrer ton message, réessaie.' : urls.length ? `✅ ${urls.length} lien${urls.length > 1 ? 's' : ''} ajouté${urls.length > 1 ? 's' : ''} à la file d'attente.` : '✅ Noté.';
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: m.chat.id, text: ack, reply_to_message_id: m.message_id }),
  });
  return res.status(200).end();
};
