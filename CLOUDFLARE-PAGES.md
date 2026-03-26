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

## Cache no Cloudflare

O backend agora envia `Cache-Control` explicito para separar o que pode e o que nao pode ser cacheado na borda da Cloudflare.

- `no-store` para HTML, login, perfil do usuario, QR Code, kit, check-in e healthcheck
- cache curto de borda para assets estaticos (`css`, `js`, imagens, fontes)
- cache curto de borda para `GET /api/feed`
- cache curto de borda para `GET /api/estandes`
- cache curto de borda para `GET /api/users?view=ranking`

Isso permite usar o cache da Cloudflare sem servir dados sensiveis ou operacionais desatualizados.

### Regras recomendadas no painel da Cloudflare

Premissa: a API precisa estar atras de um dominio com proxy ativo na Cloudflare, por exemplo `api.seudominio.com`.

Crie as seguintes `Cache Rules` nessa ordem:

1. Bypass total para rotas sensiveis

- Expression:

```text
(http.request.uri.path contains "/api/auth/") or
(http.request.uri.path contains "/api/checkins") or
(http.request.uri.path contains "/api/questions") or
(http.request.uri.path contains "/api/health") or
(http.request.uri.path matches "^/api/users/[^/]+$") or
(http.request.uri.path matches "^/api/users/[^/]+/(kit|qrcode|rota|aereo)$") or
(http.request.uri.path eq "/api/users/agenda") or
(http.request.uri.path eq "/perfil") or
(http.request.uri.path eq "/scanner")
```

- Action: `Bypass cache`

2. Cache elegivel para feed, estandes e ranking

- Expression:

```text
(
	(http.request.uri.path eq "/api/feed") or
	(http.request.uri.path eq "/api/estandes") or
	(
		(http.request.uri.path eq "/api/users") and
		(lower(http.request.uri.query) contains "view=ranking")
	)
) and (http.request.method eq "GET")
```

- Action: `Eligible for cache`
- Edge TTL: `Use cache-control header if present`
- Browser TTL: `Respect origin`

3. Bypass para HTML da aplicacao

- Expression:

```text
http.request.uri.path matches "^/$|^/[^.]*$|\.html$"
```

- Action: `Bypass cache`

### Configuracoes complementares

- `Caching > Configuration > Browser Cache TTL`: pode deixar `Respect Existing Headers`
- `Caching > Configuration > Always Online`: opcional, nao impacta a API dinamica
- Nao habilite `Cache Everything` de forma global no dominio da API

### Como validar

Depois do deploy do backend atras da Cloudflare, teste os headers.

Endpoints que devem cachear na borda:

```bash
curl -I https://api.seudominio.com/api/feed
curl -I https://api.seudominio.com/api/estandes
curl -I "https://api.seudominio.com/api/users?view=ranking"
```

Voce deve ver algo como:

```text
cache-control: public, max-age=15, s-maxage=30, stale-while-revalidate=60
cf-cache-status: HIT
```

Endpoints que nao devem cachear:

```bash
curl -I https://api.seudominio.com/api/health
curl -I https://api.seudominio.com/api/users/123/kit
curl -I https://api.seudominio.com/perfil
```

Voce deve ver algo como:

```text
cache-control: no-store, no-cache, must-revalidate, private
cf-cache-status: BYPASS
```

### Leitura pratica

- `HIT`: Cloudflare entregou do cache
- `MISS`: primeira requisicao, ainda nao aqueceu o cache
- `BYPASS`: a regra ou o header impediu cache
- `EXPIRED`: havia cache, mas precisou revalidar

## Checklist

1. Publicar o backend.
2. Garantir que `public/js/runtime-config.js` aponta para esse backend.
3. Configurar `CORS_ALLOWED_ORIGINS` e `CLOUDFLARE_PAGES_PROJECT` no backend.
4. Criar o projeto no Cloudflare Pages usando este repositorio.
5. Confirmar login, feed, perfil e perguntas no dominio final.