const express = require('express');
const QRCode = require('qrcode');


module.exports = function(getBaseUrl) {
  const router = express.Router();

  
  router.get('/qr/:idOrHash', async (req, res) => {
    try {
      const idOrHash = req.params.idOrHash;
      const base = getBaseUrl(req);
   
      const verifyUrl = `${base}/certificados/verificar/${idOrHash}`;

      const png = await QRCode.toBuffer(verifyUrl, {
        type: 'png',
        errorCorrectionLevel: 'M',
        scale: 8,
        margin: 1
      });
      res.set('Content-Type', 'image/png');
      res.send(png);
    } catch (err) {
      console.error('QR generation error:', err);
      res.status(500).json({ error: 'Falha ao gerar QR Code' });
    }
  });

 
  router.get('/verification-link/:idOrHash', async (req, res) => {
    try {
      const idOrHash = req.params.idOrHash;
      const base = getBaseUrl(req);
      const verifyUrl = `${base}/certificados/verificar/${idOrHash}`;
      const dataUrl = await QRCode.toDataURL(verifyUrl, { errorCorrectionLevel: 'M', scale: 8, margin: 1 });
      res.json({ verifyUrl, qrPngDataUrl: dataUrl });
    } catch (err) {
      console.error('Verification link error:', err);
      res.status(500).json({ error: 'Falha ao gerar link/QR' });
    }
  });

  return router;
};
