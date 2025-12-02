const express = require('express');
require('dotenv').config();
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const logger = require('./utils/logger');
const cors = require('cors');
const mongoose = require('mongoose');



const Certificado = require('./models/Certificado'); 

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado ao MongoDB Atlas com sucesso!'))
  .catch(err => console.error('Erro ao conectar ao MongoDB Atlas:', err));

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
    logger.info(`Request received: ${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        body: req.body,
        query: req.query
    });
    next();
});
// app.use(express.static(path.join(__dirname, 'public'))); // Frontend separado, não precisa servir estáticos aqui

// const getBaseUrl = require('./utils/baseUrl'); // Não é mais necessário, usaremos FRONTEND_URL diretamente
// const qrRoutes = require('./routes/qr')(getBaseUrl); // Não é mais necessário, usaremos FRONTEND_URL diretamente
// app.use('/api', qrRoutes); // Não é mais necessário, a rota foi movida para app.js ou não é mais usada


const CERTS_DIR = path.join(__dirname, 'certs');



if (!fs.existsSync(CERTS_DIR)) fs.mkdirSync(CERTS_DIR);


function validatePayload(p) {
  if (!p.aluno || !p.aluno.nome || !p.aluno.id) return 'Campo aluno (id/nome) obrigatório';
  if (!p.atividade || !p.atividade.nome) return 'Campo atividade.nome obrigatório';
  if (!p.cargaHoraria) return 'Campo cargaHoraria obrigatório';
  if (!p.data) return 'Campo data obrigatório';
  if (!p.responsavel || !p.responsavel.nome) return 'Campo responsavel.nome obrigatório';
  return null;
}

async function gerarPDF(certMeta, filePath) {
  return new Promise(async (resolve, reject) => {
    const PDFDocument = require("pdfkit");
    const fs = require("fs");
    const path = require("path");
    const QRCode = require("qrcode");

    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const grad = doc.linearGradient(0, 0, 0, 842);
    grad.stop(0, "#050b18").stop(1, "#0a182a");
    doc.rect(0, 0, 595, 842).fill(grad);

    doc.lineWidth(3)
       .strokeColor("#00eaff")
       .roundedRect(20, 20, 555, 802, 12)
       .stroke();

    try {
      const logo = path.join(__dirname, "public", "img", "logo.png");
      if (fs.existsSync(logo)) doc.image(logo, 40, 28, { width: 48 });
    } catch {}

    doc.font("Helvetica-Bold").fontSize(30).fillColor("#00eaff")
       .text("CERTIFICADO DIGITAL", 0, 120, { align: "center" }).moveDown(2);

    doc.font("Helvetica").fontSize(14).fillColor("#e0e0e0")
       .text("Certificamos que:", { align: "center" }).moveDown(1);
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#ffffff")
       .text(certMeta.aluno.nome, { align: "center" }).moveDown(1);
    doc.font("Helvetica").fontSize(14).fillColor("#e0e0e0")
       .text(`concluiu com êxito a atividade:`, { align: "center" })
       .moveDown(0.5).font("Helvetica-Bold").fillColor("#00eaff")
       .text(certMeta.atividade.nome, { align: "center" }).moveDown(1);
    doc.font("Helvetica").fillColor("#e0e0e0")
       .text(`com carga horária de ${certMeta.cargaHoraria} horas, realizada em ${certMeta.data}.`, { align: "center" })
       .moveDown(3);

    const centerX = doc.page.width / 2 - 100;
    doc.moveTo(centerX, doc.y).lineTo(centerX + 200, doc.y)
       .strokeColor("#00eaff").lineWidth(1).stroke();
    doc.font("Helvetica").fontSize(12).fillColor("#a0a0a0")
       .text(certMeta.responsavel.nome, { align: "center" })
       .text("Responsável pela Emissão", { align: "center" }).moveDown(2);

   

 
   const envBase = (process.env.FRONTEND_URL || 'http://localhost:3000').trim();
    const base = envBase.replace(/\/$/, '');

 
    const absoluteVerificationUrl = `${base}/certificados/verificar/${certMeta.hash}`; // URL de verificação para o QR Code
        const qrContent = certMeta.hash ? absoluteVerificationUrl : `${base}/api/certificados/${certMeta.id}/download`; // Fallback removido, o hash deve estar sempre disponível aqui.

    try {
      const qrSize = 110;
      const qrBuffer = await QRCode.toBuffer(qrContent, {
        type: 'png',
        errorCorrectionLevel: 'M',
        margin: 0,
        scale: 6,
      });

      const qrX = doc.page.width - 20 - qrSize;
      const qrY = doc.page.height - 20 - qrSize - 10;
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    } catch (e) {
      console.error('Falha ao gerar/desenhar QR no PDF:', e);
      doc.font('Helvetica').fontSize(8).fillColor('#ff8080')
         .text('QR indisponível', 470, 720);
    }

    doc.end();
    stream.on("finish", () => resolve());
    stream.on("error", (err) => reject(err));
  });
}

function calcularHash(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}


app.post('/api/certificados/emitir', async (req, res) => {
  try {
    const payload = req.body;
    const err = validatePayload(payload);
    if (err) return res.status(400).json({ error: err });

    const id = uuidv4();
    const certMeta = {
      id,
      aluno: payload.aluno,
      atividade: payload.atividade,
      cargaHoraria: payload.cargaHoraria,
      data: payload.data,
      responsavel: payload.responsavel,
      status: 'PENDENTE',
      criadoEm: new Date().toISOString()
    };

    
    const novoCertificado = new Certificado(certMeta);
    await novoCertificado.save();
logger.event('Certificado emitido', { id: certMeta.id, aluno: certMeta.aluno.nome, atividade: certMeta.atividade.nome });

    const pdfPath = path.join(CERTS_DIR, `${id}.pdf`);


await gerarPDF(certMeta, pdfPath);

console.log(`Caminho do PDF gerado: ${pdfPath}`);
if (!fs.existsSync(pdfPath)) {
  console.error(`Erro: PDF não encontrado no caminho ${pdfPath}`);
  return res.status(500).json({ error: 'Falha ao gerar PDF' });
}


    const hash = calcularHash(pdfPath);
    certMeta.hash = hash;
    certMeta.status = 'EMITIDO';


await gerarPDF(certMeta, pdfPath);;

    const baseFrontend = process.env.FRONTEND_URL || 'https://sistema-de-certificado-digital.vercel.app/';
const baseBackend = process.env.BACKEND_URL || 'https://sistema-de-certificadodigital.onrender.com'; 

certMeta.urlDownload = `${baseBackend}/api/certificados/${id}/download`;
certMeta.urlVerificacao = `${baseFrontend}/certificados/verificar/${hash}`;

   
    await Certificado.findByIdAndUpdate(novoCertificado._id, certMeta);

    return res.status(201).json({
      id: certMeta.id,
      status: certMeta.status,
      hash: certMeta.hash,
      urlDownload: certMeta.urlDownload,
      urlVerificacao: certMeta.urlVerificacao
    });
  } catch (e) {
    console.error(e);
    logger.error('Erro interno ao emitir certificado', { error: e.message, stack: e.stack, payload: payload });
    return res.status(500).json({ error: 'Erro interno ao emitir certificado' });
  }
});


app.get('/api/certificados', async (req, res) => {
  const { alunoId, status } = req.query;
  let query = {};

  if (alunoId) query['aluno.id'] = alunoId;
  if (status) query['status'] = status;

  const certificados = await Certificado.find(query);
  return res.json(certificados);
});


app.get('/api/certificados/public/:idOrHash', async (req, res) => {
  const idOrHash = req.params.idOrHash;
  const certificado = await Certificado.findOne({ $or: [{ id: idOrHash }, { hash: idOrHash }] });

  if (!certificado) return res.status(404).json({ error: 'Certificado não encontrado' });
    if (certificado.status === 'REVOGADO') {
        logger.event('Certificado revogado acessado', { id: certificado.id, hash: certificado.hash });
    }
  return res.json(certificado);
});



app.get('/api/certificados/:id', async (req, res) => {
  const id = req.params.id;

  try {
  

    const cert = await Certificado.findOne({ id: id });
    
    if (!cert) {
      return res.status(404).json({ error: 'Certificado não encontrado' });
    }
    
    return res.json(cert);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar certificado' });
  }
});


app.get('/api/certificados/:id/download', async (req, res) => {
    const id = req.params.id;

    console.log(`[DEBUG DOWNLOAD] Tentativa de download para ID: ${id}`);

    try {
     
        const cert = await Certificado.findOne({ id: id });

        if (!cert) {
            logger.error('Download falhou: Certificado não encontrado', { id: id });
            console.error(`[DEBUG DOWNLOAD] FALHA: Certificado não encontrado no DB com ID: ${id}`);
            return res.status(404).json({ error: 'Certificado não encontrado' });
        }
        
        console.log(`[DEBUG DOWNLOAD] SUCESSO: Certificado encontrado no DB. Status: ${cert.status}`);

       
        const pdfPath = path.join(__dirname, 'certs', `${id}.pdf`);

        

        if (!fs.existsSync(pdfPath)) {
            console.log(`[DEBUG DOWNLOAD] Arquivo PDF não encontrado no caminho: ${pdfPath}. Regenerando...`);
            // Regenerar o PDF se não for encontrado (comum em ambientes serverless)
            await gerarPDF(cert, pdfPath);
            if (!fs.existsSync(pdfPath)) {
                logger.error('Download falhou: Falha ao regenerar o PDF', { id: id, pdfPath: pdfPath });
                console.error(`[DEBUG DOWNLOAD] FALHA: Falha ao regenerar o PDF.`);
                return res.status(500).json({ error: 'Falha ao gerar o PDF para download' });
            }
        }
        
        console.log(`[DEBUG DOWNLOAD] SUCESSO: Arquivo PDF encontrado no disco. Enviando...`);
        
       
        res.download(pdfPath, `${id}.pdf`, (err) => {
            if (err) {
              
                logger.error('Download falhou: Erro ao enviar o arquivo', { id: id, error: err.message });
              
                console.error('[DEBUG DOWNLOAD] Erro ao enviar o arquivo (res.download):', err);
            } else {
                console.log(`[DEBUG DOWNLOAD] Download do arquivo ${id}.pdf enviado com sucesso.`);
            }
        });
    } catch (err) {
        logger.error('Erro interno na rota de download', { id: id, error: err.message, stack: err.stack });
        console.error('[DEBUG DOWNLOAD] Erro interno na rota de download:', err);
        return res.status(500).json({ error: 'Erro ao realizar o download do PDF' });
    }
});



// Rota para revogar um certificado
app.post('/api/certificados/:id/revogar', async (req, res) => {
    const id = req.params.id;
    try {
        const cert = await Certificado.findOne({ id: id });
        if (!cert) {
            logger.error('Tentativa de revogar certificado não encontrado', { id: id });
            return res.status(404).json({ error: 'Certificado não encontrado' });
        }

        if (cert.status === 'REVOGADO') {
            return res.status(200).json({ message: 'Certificado já está revogado' });
        }

        cert.status = 'REVOGADO';
        await cert.save();
        
        logger.event('Certificado revogado', { id: id, hash: cert.hash });
        
        // Simulação de Webhook/Notificação
        notificarMudancaStatus(cert);

        return res.status(200).json({ message: 'Certificado revogado com sucesso', status: 'REVOGADO' });

    } catch (e) {
        logger.error('Erro ao revogar certificado', { id: id, error: e.message, stack: e.stack });
        return res.status(500).json({ error: 'Erro interno ao revogar certificado' });
    }
});

// Função de simulação de notificação (Webhook)
function notificarMudancaStatus(certificado) {
    // Em um cenário real, esta função faria uma requisição HTTP POST para um endpoint de webhook
    // Aqui, apenas logamos a notificação.
    logger.event('Notificação de Webhook (Simulação)', {
        tipo: 'status_change',
        id: certificado.id,
        status: certificado.status,
        timestamp: new Date().toISOString()
    });
    console.log(`[WEBHOOK SIMULADO] Notificação enviada para o certificado ${certificado.id} com status ${certificado.status}`);
}

// A rota de verificação agora é responsabilidade do Frontend (Vercel)
// app.get('/certificados/verificar/:idOrHash', (req, res) => {
//   return res.sendFile(path.join(__dirname, 'public', 'verify.html'));
// });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor rodando em http://localhost:' + PORT));