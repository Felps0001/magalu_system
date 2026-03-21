# Cloudflare Pages

Este projeto esta preparado para publicar o frontend estatico no Cloudflare Pages e manter o backend Node/Express separado.

## O que publicar

- Frontend estatico: pasta `dist`
- Backend Node/Express: continua em um host que rode Node, como Render

## Build do frontend

```bash
npm ci
npm run build:pages
```

O comando gera a pasta `dist`, que deve ser usada como output do Cloudflare Pages.

## Configuracao no Cloudflare Pages

- Framework preset: `None`
- Build command: `npm run build:pages`
- Build output directory: `dist`
- Node version: `22`

## Backend e CORS

O frontend em producao usa a URL configurada em `public/js/runtime-config.js`.

No backend, configure no `.env`:

```env
CORS_ALLOWED_ORIGINS=https://seu-projeto.pages.dev,https://app.seudominio.com
CLOUDFLARE_PAGES_PROJECT=seu-projeto
```

`CLOUDFLARE_PAGES_PROJECT` libera automaticamente:

- `https://seu-projeto.pages.dev`
- previews `https://<branch>.seu-projeto.pages.dev`

`CORS_ALLOWED_ORIGINS` cobre dominio customizado e quaisquer outras origens explicitas.

## Checklist

1. Publicar o backend.
2. Garantir que `public/js/runtime-config.js` aponta para esse backend.
3. Configurar `CORS_ALLOWED_ORIGINS` e `CLOUDFLARE_PAGES_PROJECT` no backend.
4. Criar o projeto no Cloudflare Pages usando este repositorio.
5. Confirmar login, feed, perfil e perguntas no dominio final.