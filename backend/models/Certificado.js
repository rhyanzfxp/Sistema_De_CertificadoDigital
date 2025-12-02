const mongoose = require('mongoose');

const CertificadoSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, 

  aluno: {
    id: { type: String, required: true },
    nome: { type: String, required: true }
  },
  atividade: {
    nome: { type: String, required: true }
  },
  cargaHoraria: { type: Number, required: true },
  data: { type: String, required: true },
  responsavel: {
    nome: { type: String, required: true }
  },
  status: { type: String, default: 'PENDENTE' },
  hash: { type: String },
  urlDownload: { type: String },
  urlVerificacao: { type: String },
  criadoEm: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Certificado', CertificadoSchema);