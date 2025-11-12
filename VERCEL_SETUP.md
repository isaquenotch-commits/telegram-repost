# Configuração Manual na Vercel Dashboard

Se o `vercel.json` estiver causando problemas, configure manualmente no dashboard:

## Passo a Passo

### 1. Acesse o Dashboard da Vercel
- Vá para [vercel.com/dashboard](https://vercel.com/dashboard)
- Selecione seu projeto

### 2. Vá em Settings → General

**Root Directory:** Deixe vazio (raiz do projeto)

**Framework Preset:** Next.js

**Build Command:** `cd frontend && npm install && npm run build`

**Output Directory:** `frontend/.next`

**Install Command:** `cd frontend && npm install`

### 3. A Vercel detectará automaticamente:
- ✅ Next.js em `frontend/`
- ✅ Python Serverless Functions em `api/`

### 4. Variáveis de Ambiente
Vá em **Settings → Environment Variables** e adicione:
- `TELEGRAM_BOT_TOKEN` = seu token

### 5. Deploy
Clique em **Deployments** → **Redeploy**

## Alternativa: Remover vercel.json

Se ainda houver problemas, você pode:
1. Deletar o `vercel.json`
2. Configurar tudo no dashboard da Vercel
3. A Vercel detectará automaticamente Next.js e Python

