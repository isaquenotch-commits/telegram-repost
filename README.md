# Bot Repost Telegram

Sistema automatizado de repost para Telegram que permite postar conteúdo de um canal de estoque para múltiplos canais de destino com template customizado, delay configurável e monitoramento em tempo real.

## Características

- ✅ Postagem automatizada de vídeos, fotos e documentos
- ✅ Remoção automática de metadados (autor, nome do canal)
- ✅ Template customizado de texto
- ✅ Botões inline com URL e CTA personalizados
- ✅ Delay configurável entre postagens
- ✅ Interface web moderna com Next.js e ShadCN
- ✅ Logs em tempo real via Server-Sent Events (SSE)
- ✅ Barra de progresso e tempo restante
- ✅ Múltiplos canais de destino

## Estrutura do Projeto

```
telegram-repost/
├── backend/          # API Python (FastAPI) + Bot Telegram
├── frontend/         # Interface Next.js + ShadCN
└── README.md
```

## Pré-requisitos

- Python 3.10+
- Node.js 18+
- Token do Bot Telegram
- Bot deve ser admin nos canais de estoque e destino

## Instalação

### Backend

1. Navegue para o diretório backend:
```bash
cd backend
```

2. Crie um ambiente virtual:
```bash
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
```

3. Instale as dependências:
```bash
pip install -r requirements.txt
```

4. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione seu token do bot:
```
TELEGRAM_BOT_TOKEN=seu_token_aqui
BACKEND_PORT=8000
```

5. Execute o backend:
```bash
python run.py
```

O backend estará rodando em `http://localhost:8000`

### Frontend

1. Navegue para o diretório frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Configure a URL da API (opcional):
Crie um arquivo `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. Execute o frontend:
```bash
npm run dev
```

O frontend estará rodando em `http://localhost:3000`

## Iniciando Backend e Frontend Juntos

Para iniciar ambos os servidores simultaneamente, você pode usar um dos scripts fornecidos:

### Windows
```bash
start.bat
```

### Linux/Mac
```bash
chmod +x start.sh
./start.sh
```

### Python (Multiplataforma)
```bash
python start.py
```

Todos os scripts irão:
- Verificar se as dependências estão instaladas
- Iniciar o backend na porta 8000
- Aguardar 3 segundos
- Iniciar o frontend na porta 3000
- Exibir os links de acesso

**Nota**: No Windows, os scripts abrem janelas separadas para cada servidor. No Linux/Mac, os processos rodam em background e podem ser parados com `Ctrl+C`.

## Como Usar

1. **Configure o Canal de Estoque**
   - Na interface web, insira o ID do canal de estoque (ex: `@estoque`)
   - Certifique-se de que o bot é admin do canal

2. **Configure os Canais de Destino**
   - Adicione os canais de destino onde o conteúdo será postado
   - Marque os canais que devem receber as postagens
   - Certifique-se de que o bot é admin de todos os canais de destino

3. **Configure o Template de Postagem**
   - Defina o texto padrão que será adicionado a cada post
   - Configure o botão (label e URL) se desejar

4. **Configure o Delay**
   - Defina o intervalo mínimo e máximo entre postagens (em segundos)

5. **Envie Conteúdo para o Canal de Estoque**
   - Envie os vídeos/fotos/documentos para o canal de estoque
   - O bot armazenará essas mensagens automaticamente

6. **Inicie as Postagens**
   - Clique em "Iniciar Postagens"
   - Acompanhe o progresso em tempo real nos logs
   - O sistema postará automaticamente em todos os canais de destino

## API Endpoints

### Configuração
- `GET /api/config` - Obtém configuração atual
- `POST /api/config` - Salva configuração
- `POST /api/config/stock-channel` - Define canal de estoque
- `POST /api/config/destination-channels` - Define canais de destino
- `POST /api/config/post-config` - Define configuração de postagem

### Controle
- `POST /api/control/start` - Inicia postagens
- `POST /api/control/stop` - Para postagens
- `GET /api/control/status` - Obtém status atual

### Logs
- `GET /api/logs/stream` - Stream de logs em tempo real (SSE)

## Tecnologias

### Backend
- Python 3.10+
- FastAPI
- python-telegram-bot v20
- asyncio para operações assíncronas

### Frontend
- Next.js 14+
- React 18+
- TypeScript
- ShadCN UI
- Tailwind CSS

## Notas Importantes

1. **Permissões do Bot**: O bot precisa ser admin em todos os canais (estoque e destinos) com permissões para:
   - Ler mensagens
   - Enviar mensagens
   - Editar mensagens (para adicionar template e botões)

2. **Armazenamento de Mensagens**: As mensagens são armazenadas em memória. Para persistência, considere implementar um banco de dados.

3. **Limites do Telegram**: Respeite os limites de rate limiting do Telegram. O delay entre postagens ajuda a evitar bloqueios.

4. **File IDs**: O sistema usa `copy_message` quando possível, que é mais eficiente. Para mensagens com template customizado, o sistema faz download e reenvio da mídia.

## Troubleshooting

### Bot não recebe mensagens do canal
- Verifique se o bot é admin do canal
- Verifique se o bot tem permissão para ler mensagens
- Certifique-se de que o ID do canal está correto

### Erro ao postar em canais de destino
- Verifique se o bot é admin dos canais de destino
- Verifique se o bot tem permissão para enviar mensagens
- Verifique se os IDs dos canais estão corretos

### Logs não aparecem em tempo real
- Verifique se o backend está rodando
- Verifique se a conexão SSE está funcionando
- Verifique o console do navegador para erros

## Desenvolvimento

### Estrutura do Backend
```
backend/
├── bot/
│   ├── telegram_bot.py      # Lógica principal do bot
│   ├── post_processor.py    # Processamento de posts
│   └── message_handler.py   # Handler de mensagens
├── api/
│   ├── main.py              # Aplicação FastAPI
│   └── routes/              # Rotas da API
├── models/
│   └── config.py            # Modelos de dados
└── requirements.txt
```

### Estrutura do Frontend
```
frontend/
├── app/
│   ├── page.tsx             # Página principal (Estoque)
│   ├── relatorio/
│   │   └── page.tsx         # Página de relatórios
│   └── layout.tsx           # Layout principal
├── components/
│   ├── ui/                  # Componentes ShadCN
│   └── ...                  # Componentes customizados
└── lib/
    └── api.ts               # Cliente API
```

## Licença

Este projeto é de código aberto e está disponível sob a licença MIT.

## Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

