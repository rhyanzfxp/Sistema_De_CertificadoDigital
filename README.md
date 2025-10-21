# Certificado Digital - Exemplo (Node.js + Express)

Este projeto de exemplo implementa os **Requisitos 01 e 02** solicitados:
1. **Emitir certificado digital a partir de dados acadêmicos validados** (aluno, atividade, carga horária, data, responsáveis).
2. **Consultar status da emissão e recuperar o certificado (PDF + hash / ID de verificação)**.

## Funcionalidades
- `POST /api/certificados/emitir` - recebe payload JSON, valida campos mínimos, gera PDF, calcula hash SHA-256 do PDF e salva metadados.
- `GET /api/certificados/:id` - retorna metadados (status, hash, URLs).
- `GET /api/certificados/:id/download` - retorna o PDF do certificado.

Frontend simples com Bootstrap disponível em `public/`:
- `index.html`, `emitir.html`, `certificados.html` (faz chamadas à API via fetch).

## Como rodar

```bash
# 1. instalar dependências
npm install

# 2. rodar
npm start

# padrão: servidor roda em http://localhost:3000
```

## Observações
- Este é um mock/prova de conceito. Em produção, substitua:
  - Armazenamento em arquivo por banco de dados.
  - Segurança (autenticação, HTTPS, validação aprofundada).
  - Geração/armazenamento de chaves e rotação de tokens.
