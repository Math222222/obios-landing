// Lance la connexion TikTok (Login Kit) : redirige vers TikTok avec la clé de l'app (variable Vercel TIKTOK_CLIENT_KEY).
module.exports = (req, res) => {
  const p = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY || '', scope: 'user.info.basic,video.upload', response_type: 'code',
    redirect_uri: 'https://www.obios.fr/api/tiktok/callback', state: Math.random().toString(36).slice(2),
  });
  res.writeHead(302, { Location: 'https://www.tiktok.com/v2/auth/authorize/?' + p }).end();
};
