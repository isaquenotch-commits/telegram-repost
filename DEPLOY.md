# Guia de Deploy na Vercel

Este guia explica como fazer deploy do projeto Telegram Repost na Vercel.

## 📋 Pré-requisitos

1. Conta na [Vercel](https://vercel.com)
2. Projeto no GitHub, GitLab ou Bitbucket (recomendado)
3. Token do Bot Telegram configurado

## 🚀 Deploy via Vercel CLI

### 1. Instalar Vercel CLI

```bash
npm i -g vercel
```

### 2. Fazer login na Vercel

```bash
vercel login
```

### 3. Configurar variáveis de ambiente

Antes do deploy, você precisa configurar as variáveis de ambiente:

```bash
vercel env add TELEGRAM_BOT_TOKEN
# Cole seu token do bot quando solicitado
```

### 4. Fazer deploy

```bash
vercel
```

Siga as instruções:
- **Set up and deploy?** → `Y`
- **Which scope?** → Selecione sua conta
- **Link to existing project?** → `N` (primeira vez)
- **Project name?** → `telegram-repost` (ou o nome que preferir)
- **Directory?** → `.` (raiz do projeto)
- **Override settings?** → `N`

### 5. Deploy em produção

```bash
vercel --prod
```

## 🌐 Deploy via Dashboard da Vercel

### 1. Conectar repositório

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **Add New Project**
3. Importe seu repositório do GitHub/GitLab/Bitbucket

### 2. Configurar o projeto

**Framework Preset:** Next.js (detectado automaticamente)

**Root Directory:** Deixe vazio ou use `.`

**Build Command:** `cd frontend && npm install && npm run build`

**Output Directory:** `frontend/.next`

**Install Command:** `cd frontend && npm install`

### 3. Configurar variáveis de ambiente

Na seção **Environment Variables**, adicione:

| Nome | Valor | Ambiente |
|------|-------|----------|
| `TELEGRAM_BOT_TOKEN` | Seu token do bot | Production, Preview, Development |
| `NEXT_PUBLIC_API_URL` | Deixe vazio (será preenchido automaticamente) | Production, Preview, Development |

### 4. Fazer deploy

Clique em **Deploy** e aguarde o processo concluir.

## ⚙️ Configurações Importantes

### Estrutura do Projeto

A Vercel detectará automaticamente:
- **Frontend:** Pasta `frontend/` (Next.js)
- **Backend:** Pasta `api/` (Python Serverless Functions)

### Variáveis de Ambiente

As seguintes variáveis são necessárias:

- `TELEGRAM_BOT_TOKEN` - Token do seu bot Telegram (obrigatório)
- `NEXT_PUBLIC_API_URL` - URL da API (opcional, será detectada automaticamente)

### CORS

O backend está configurado para aceitar requisições da Vercel automaticamente. As URLs permitidas são:
- `http://localhost:3000` (desenvolvimento local)
- `https://[seu-projeto].vercel.app` (produção)

## 🔧 Troubleshooting

### Erro: "Module not found"

Se houver erros de módulos não encontrados:

1. Verifique se o `requirements.txt` está na pasta `api/`
2. Certifique-se de que todas as dependências estão listadas
3. Verifique os logs de build na Vercel

### Erro: "CORS policy"

Se houver erros de CORS:

1. Verifique se a variável `VERCEL_URL` está sendo detectada
2. Adicione manualmente a URL do seu projeto nas origens permitidas no código

### Backend não responde

1. Verifique se o arquivo `api/index.py` existe
2. Verifique os logs de função na Vercel
3. Certifique-se de que o `vercel.json` está configurado corretamente

### Bot não funciona

1. Verifique se `TELEGRAM_BOT_TOKEN` está configurado corretamente
2. Verifique os logs do backend na Vercel
3. Certifique-se de que o bot tem as permissões necessárias nos canais

## 📝 Notas Importantes

### Limitações da Vercel

1. **Serverless Functions:** O backend roda como serverless functions, o que significa:
   - Cada requisição pode ter um "cold start"
   - O estado não persiste entre requisições (use banco de dados para persistência)
   - Timeout máximo de 60 segundos (plano Hobby) ou 300 segundos (plano Pro)

2. **WebSockets/SSE:** Server-Sent Events podem ter limitações. Considere usar polling como fallback.

3. **Armazenamento:** Dados em memória não persistem. Considere usar:
   - Vercel KV (Redis)
   - Vercel Postgres
   - Outro serviço de banco de dados

### Recomendações

1. **Para produção:** Considere usar um serviço dedicado para o backend (Railway, Render, etc.) se precisar de:
   - Conexões persistentes
   - WebSockets
   - Processos longos
   - Estado persistente

2. **Híbrido:** Você pode fazer deploy do frontend na Vercel e do backend em outro serviço, atualizando apenas a variável `NEXT_PUBLIC_API_URL`.

## 🔗 Links Úteis

- [Documentação da Vercel](https://vercel.com/docs)
- [Serverless Functions Python](https://vercel.com/docs/functions/serverless-functions/runtimes/python)
- [Next.js na Vercel](https://vercel.com/docs/frameworks/nextjs)

## 📞 Suporte

Se encontrar problemas, verifique:
1. Logs de build na Vercel
2. Logs de função na Vercel
3. Console do navegador (F12)
4. Network tab para ver requisições


