
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


const getBaseUrl = require('./utils/baseUrl');
const qrRoutes = require('./routes/qr')(getBaseUrl);
app.use('/api', qrRoutes);

const DATA_DIR = path.join(__dirname, 'data');
const CERTS_DIR = path.join(__dirname, 'certs');
const DB_FILE = path.join(DATA_DIR, 'certificados.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(CERTS_DIR)) fs.mkdirSync(CERTS_DIR);
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));

function readDB(){
  return JSON.parse(fs.readFileSync(DB_FILE));
}
function writeDB(data){
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function validatePayload(p){
  if(!p.aluno || !p.aluno.nome || !p.aluno.id) return 'Campo aluno (id/nome) obrigatório';
  if(!p.atividade || !p.atividade.nome) return 'Campo atividade.nome obrigatório';
  if(!p.cargaHoraria) return 'Campo cargaHoraria obrigatório';
  if(!p.data) return 'Campo data obrigatório';
  if(!p.responsavel || !p.responsavel.nome) return 'Campo responsavel.nome obrigatório';
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


    doc.circle(80, 660, 42).lineWidth(3).strokeColor("#00eaff").stroke();
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#00eaff")
       .text("SELO", 60, 655);
    doc.font("Helvetica").fontSize(7).fillColor("#00eaff")
       .text("DE AUTENTICIDADE", 44, 665);

const envBase = (process.env.BASE_URL_EXTERNA || 'https://crazy-bushes-see.loca.lt').trim();
const base = envBase.replace(/\/$/, '');
const verifyPath = (certMeta.urlVerificacao || ('/certificados/verificar/' + (certMeta.hash || certMeta.id)));
const absoluteVerifyUrl = verifyPath.startsWith('http') ? verifyPath : (base + verifyPath);
try {
  const qrSize = 110;
  const qrBuffer = await QRCode.toBuffer(absoluteVerifyUrl, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 0,
    scale: 6,
  });


  const qrX = doc.page.width  - 20 - qrSize;
  const qrY = doc.page.height - 20 - qrSize - 10; 

  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
} catch (e) {
  console.error('Falha ao gerar/desenhar QR no PDF:', e);
  doc.font('Helvetica').fontSize(8).fillColor('#ff8080')
     .text('QR indisponível', 470, 720);
}
 
    doc.font("Helvetica").fontSize(9).fillColor("#ffffff")
       .text("Verificação pública:", 40, 730);
    doc.fillColor("#00eaff").text(absoluteVerifyUrl, 40, 742, { width: 400 });
    doc.font("Helvetica").fontSize(10).fillColor("#00eaff")
       .text(`ID do Certificado: ${certMeta.id}`, 0, 740, { align: "center" })
       .moveDown(0.3)
       .text(`Hash: ${certMeta.hash || "gerando..."}`, { align: "center" });

    doc.circle(80, 760, 4).fill("#00eaff");
    doc.circle(515, 760, 4).fill("#00eaff");

    doc.end();
    stream.on("finish", () => resolve());
    stream.on("error", (err) => reject(err));
  });
}


function calcularHash(filePath){
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}




app.post('/api/certificados/emitir', async (req, res) => {
  try{
    const payload = req.body;
    const err = validatePayload(payload);
    if(err) return res.status(400).json({error: err});

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

    const db = readDB();
    db.push(certMeta);
    writeDB(db);

    const pdfPath = path.join(CERTS_DIR, `${id}.pdf`);
    await gerarPDF(certMeta, pdfPath);

    const hash = calcularHash(pdfPath);
    certMeta.hash = hash;
    certMeta.status = 'EMITIDO';
    certMeta.urlDownload = `/api/certificados/${id}/download`;
    certMeta.urlVerificacao = `/certificados/verificar/${hash}`;

    const db2 = readDB().map(c => c.id === id ? certMeta : c);
    writeDB(db2);

    return res.status(201).json({
      id: certMeta.id,
      status: certMeta.status,
      hash: certMeta.hash,
      urlDownload: certMeta.urlDownload,
      urlVerificacao: certMeta.urlVerificacao
    });
  }catch(e){
    console.error(e);
    return res.status(500).json({error: 'Erro interno ao emitir certificado'});
  }
});


app.get('/api/certificados', (req, res) => {
  const db = readDB();
  const { alunoId, status } = req.query;
  let result = db;
  if(alunoId) result = result.filter(r => r.aluno && r.aluno.id == alunoId);
  if(status) result = result.filter(r => r.status == status);
  return res.json(result);
});


app.get('/api/certificados/public/:idOrHash', (req, res) => {
  const idOrHash = req.params.idOrHash;
  const db = readDB();
  const cert = db.find(c => c.hash === idOrHash || c.id === idOrHash);
  if(!cert) return res.status(404).json({error:'Certificado não encontrado'});
  return res.json(cert);
});


app.get('/api/certificados/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  const cert = db.find(c => c.id === id);
  if(!cert) return res.status(404).json({error: 'Certificado não encontrado'});
  return res.json(cert);
});


app.get('/api/certificados/:id/download', (req, res) => {
  const id = req.params.id;
  const pdfPath = path.join(CERTS_DIR, `${id}.pdf`);
  if(!fs.existsSync(pdfPath)) return res.status(404).json({error: 'Arquivo PDF não encontrado'});
  res.download(pdfPath, `${id}.pdf`);
});


app.get('/certificados/verificar/:idOrHash', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Servidor rodando em http://localhost:'+PORT));