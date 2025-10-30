
module.exports = function getBaseUrl(req) {
  const configured = process.env.BASE_URL_EXTERNA;
  if (configured) return configured.replace(/\/$/, '');

  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`.replace(/\/$/, '');
};
