# Prompt 01 — Fetch today's activity

> Esta rutina la ejecuta el agente al inicio de cada day cycle. Es el primer paso.
> Editable vía PR — si una fuente cambió de URL o se agrega una nueva, modificá esto.

## Objetivo

Recolectar **toda la actividad gubernamental que pasó en las últimas 24-72 horas** desde fuentes oficiales y prensa. NO interpretes ni cures todavía — eso lo hace [`03-curate.md`](03-curate.md). Acá solo bajás los datos crudos.

## Pasos

### 1. Definí la ventana

```
HOY    = $(date -u +%Y-%m-%d)
DESDE  = HOY - 3 días
HASTA  = HOY
```

### 2. Fetcheá Presidencia

```bash
curl -sL https://www.gub.uy/presidencia/comunicacion/noticias \
  | grep -oE 'href="/presidencia/comunicacion/noticias/[a-z0-9-]+"[^>]*>[^<]+' \
  | head -20
```

Para cada noticia, además fetcheá la página individual para extraer fecha + cuerpo + actores mencionados. Guardalo en estructura:

```yaml
- source: presidencia
  date: 2026-MM-DD
  title: "..."
  url: "https://..."
  summary: "1-2 frases neutrales"
  people: ["nombre1", "nombre2"]   # cruzado con data/sources.yml#people
```

### 3. Fetcheá los ministerios habilitados

Para cada `ministerio` en `data/sources.yml#ministries` con `enabled: true` y URL no en `_quarantine`:

```bash
curl -sL "${ministry.news_url}"
```

Mismo formato de output. Si una URL falla 3+ ciclos consecutivos, agregala a `_quarantine` en `state.json` (NO la elimines de `sources.yml`).

### 4. Fetcheá Parlamento (JSON-first)

**Asuntos entrados** (Senado + Diputados, JSON):

```bash
FROM=$(date -u -d '-3 days' +%Y-%m-%d)
TO=$(date -u +%Y-%m-%d)

curl -sL "https://parlamento.gub.uy/camarasycomisiones/senadores/transparencia/datos-abiertos/asuntos-entrados/json?Cpo_Codigo=All&Fechadesde=${FROM}&Fechahasta=${TO}&_format=json" \
  | jq -r '.[] | "\(.Ast_FechaDeEntradaAlCuerpo)|\(.Cpo_Codigo)|\(.Ast_Titulo)"'
```

**Diario de sesiones** (Diputados, JSON):

```bash
curl -sL https://documentos.diputados.gub.uy/docs/DAdiarioSesiones.json \
  | jq -r --arg from "$FROM" '.[] | select(.SesionFecha | type == "string") | select((.SesionFecha | gsub("/"; "-")) >= $from)'
```

**Leyes promulgadas** — sin JSON oficial; HTML scrape de `https://parlamento.gub.uy/documentosyleyes/leyes-promulgadas`.

### 5. Fetcheá prensa nacional

Para cada source en `data/sources.yml#press` con `status: ok`:
- La Diaria — `https://ladiaria.com.uy/politica/`
- Búsqueda — `https://www.busqueda.com.uy/politica`
- Subrayado — `https://www.subrayado.com.uy/politica`

Extraé titulares + URLs + cruzá menciones a `people` del watchlist.

### 6. Output

Guardá todo en una estructura intermedia (puede ser un archivo `.tmp/today-raw.yml` durante el ciclo, no comiteado). Estructura:

```yaml
window:
  from: "2026-MM-DD"
  to: "2026-MM-DD"
sources_fetched:
  presidencia: { items_count: 10, ok: true }
  ministerios:
    interior: { items_count: 5, ok: true }
    # ...
  parlamento:
    asuntos: { items_count: 12, ok: true }
    sesiones: { items_count: 2, ok: true }
  prensa:
    ladiaria: { items_count: 8, ok: true }
    # ...
items:
  - source: ...
    date: ...
    title: ...
    # etc
```

## Cascada de fallbacks (cuando una fuente falla)

El `curl` simple falla en tres escenarios bastante distintos. Antes de
declarar la fuente "off" y dejarla en `sources_off`, intentá esta cascada
en orden:

### Nivel 1 — HTTP fetch (default)

```bash
curl -sL --max-time 15 -A "Mozilla/5.0 ..." "$url"
```

Suele funcionar para sitios estáticos y endpoints JSON oficiales.

### Nivel 2 — Browser real (Playwright)

Si Nivel 1 devuelve 4xx, body vacío, o un placeholder de JS-app no
hidratado, usá:

```bash
scripts/fetch-browser.sh "$url" --screenshot
# stdout: HTML renderizado por Chromium real
# stderr: STATUS <code> + SCREENSHOT <path>
# exit 0: ok · 2: 4xx/5xx · 3: body sospechoso · 1: error
```

**Cuándo usar Nivel 2:**

- **Sitios JS-rendered** (`montevideo.com.uy` historicamente).
- **Sitios que bloquean por user-agent** (algunos ministerios).
- **Paywalled** (`busqueda.com.uy`, `subrayado.com.uy`, `ladiaria.com.uy`
  para no suscriptores): el navegador real ve el lede + headline que
  están arriba de la wall. Extraé eso; **no intentes saltear la wall**
  (eso es scraping abusivo y rompe con los términos del medio).

El screenshot queda en `.tmp/screenshots/<sha>.png` — evidencia visual
de lo que el bot vio. NO comitear (está en `.gitignore`).

### Nivel 3 — Wayback Machine

Si Nivel 2 también falla (404 persistente, dominio movido), pedile a
Internet Archive un snapshot:

```bash
scripts/wayback-fallback.sh "$url"
# SNAPSHOT <archive-url>   → usá esa URL
# TRIGGERED <save-url>     → archivó ahora, volvé en el próximo ciclo
# NONE                     → de verdad no hay nada; declarar off
```

Si conseguís un snapshot, usalo como `url` en el reporte pero **marcalo
explícitamente** en el `source_label` (ej: `LA DIARIA / archive.org`)
para que el lector sepa que está viendo una versión preservada.

### Nivel 4 — Declarar off

Si los 3 fallaron, agregá la fuente a `sources_off` con razón específica:

```yaml
- source: "El Observador / política"
  reason: "URL 404 persistente · sin snapshot en Wayback · ciclos fallidos: 4"
```

Y registralo en `state.json#failed_sources_log` con timestamp + nivel
que falló. Si una fuente acumula 5+ ciclos en Nivel 4, abrí un issue
separado titulado `[fuentes] revisar URL de X` para que un humano la
mueva a `_quarantine` o le encuentre el endpoint nuevo.

## Reglas

- ❌ **No inventes** items. Si una fuente devuelve vacío, marcá `items_count: 0` y seguí.
- ❌ **No persistas** este raw output al repo. Es scratch del ciclo.
- ❌ **No uses Playwright para saltear paywalls** — solo para leer lo que el medio sí muestra antes de la wall (típicamente headline + primer párrafo).
- ✅ Si encontrás un nuevo endpoint JSON oficial que no está en `data/sources.yml`, mencionalo en el PR del día (commit separado: "discovered new source X").
- ✅ Si una fuente está caída, **registralo** en `state.json#failed_sources_log` con timestamp + nivel de fallback que falló.

## Próximo paso

Cuando este paso termina con éxito, pasá a [`02-fetch-upcoming.md`](02-fetch-upcoming.md).
