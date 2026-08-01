# GUTO

GUTO e um sistema de acao e accountability. A interface roda em Next.js e o
backend Express concentra as chamadas de IA, voz e transcricao.

## Estrutura

- `guto-app-v0`: app Next.js.
- `guto-backend`: API Express. Em producao/preview, configure a URL publica em
  `NEXT_PUBLIC_GUTO_API_URL` (ou `NEXT_PUBLIC_API_URL`, legado). Em
  desenvolvimento, o app usa `http://localhost:3001` quando essa variavel nao
  existir.

## Rodar Localmente

1. Instale dependencias do app:
   `cd guto-app-v0 && npm install`
2. Instale dependencias do backend:
   `cd ../guto-backend && npm install`
3. Configure `guto-backend/.env`:
   `GEMINI_API_KEY=...`
   `VOICE_API_KEY=...`
   `OPENAI_API_KEY=...`
4. Opcionalmente configure `guto-app-v0/.env.local` quando quiser apontar para
   um backend publicado:
   `GUTO_BACKEND_PROXY_URL=https://sua-api-publica`
   `NEXT_PUBLIC_GUTO_API_URL=https://sua-api-publica`
5. Rode o backend:
   `cd guto-backend && npm run dev`
6. Rode o app:
   `cd guto-app-v0 && npm run dev`

## Notas Tecnicas

- O app usa `app/page.tsx`, `app/layout.tsx` e alias `@/*` via Next.js.
- O frontend nao deve chamar Gemini diretamente; ele chama o backend.
- O avatar oficial esta travado no visual azul para a primeira demo mobile,
  reduzindo peso de carregamento e variacao visual entre Safari, Chrome e
  Android.
