# RF03 — Link público e QR Code de verificação

Este pacote adiciona duas rotas:
- `GET /api/qr/:idOrHash` → retorna PNG com o QR que aponta para `/certificados/verificar/:idOrHash`
- `GET /api/verification-link/:idOrHash` → retorna `{ verifyUrl, qrPngDataUrl }`

## Instalação
1. Instale a dependência de QR:
   ```bash
   npm i qrcode
   ```
2. Importe e monte as rotas no `app.js` **após** criar o `app`:
   ```js
   const getBaseUrl = require('./utils/baseUrl');
   const qrRoutes = require('./routes/qr')(getBaseUrl);
   app.use('/api', qrRoutes);
   ```

### (Opcional) Defina a URL externa em produção
Se você usa proxy/ingress ou TLS fora do Node, defina a variável de ambiente:
```bash
BASE_URL_EXTERNA="https://seu-dominio.edu.br"
```

## Usando no Front-end
Exemplo mínimo para exibir o link e o QR de um certificado (usando o `hash` como ID público):
```html
<img id="qr" alt="QR Code de verificação">
<a id="link" target="_blank" rel="noopener">Abrir verificação</a>

<script>
  const hash = 'SUBSTITUA_PELO_HASH_DO_CERTIFICADO';
  fetch('/api/verification-link/' + hash)
    .then(r => r.json())
    .then(({ verifyUrl, qrPngDataUrl }) => {
      document.getElementById('qr').src = qrPngDataUrl;
      const a = document.getElementById('link');
      a.href = verifyUrl;
      a.textContent = verifyUrl;
    });
</script>
```

## Incluir QR dentro do PDF (opcional)
Se você quiser embutir o QR no PDF gerado com PDFKit:
```js
const QRCode = require('qrcode');
const png = await QRCode.toBuffer(verifyUrl, { type: 'png', scale: 6 });
doc.image(png, 450, 100, { width: 100 }); // ajuste posição/tamanho
```

## Observações
- O caminho usado para verificação pública está como `/certificados/verificar/:idOrHash`. Ajuste se seu projeto usa outro path.
- Caso seu JSON (`data/certificados.json`) ainda não grave `urlVerificacao`, você pode preenchê-lo com `verifyUrl` retornado e salvar no objeto do certificado.
- Para uso externo, prefira expor somente o `hash` (não o UUID interno).
