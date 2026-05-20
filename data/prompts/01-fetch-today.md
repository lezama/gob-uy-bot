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
curl -sL --max-time 15 -A "Mozilla/5.0 ..." https://www.gub.uy/presidencia/comunicacion/noticias \
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
curl -sL --max-time 15 -A "Mozilla/5.0 ..." "${ministry.news_url}"
```

Mismo formato de output. Si una URL falla 3+ ciclos consecutivos, agregala a `_quarantine` en `state.json` (NO la elimines de `sources.yml`).

### 4. Fetcheá Parlamento (JSON-first)

**Asuntos entrados** (Senado + Diputados, JSON):

```bash
FROM=$(date -u -d '-3 days' +%Y-%m-%d)
TO=$(date -u +%Y-%m-%d)

curl -sL --max-time 15 -A "Mozilla/5.0 ..." "https://parlamento.gub.uy/camarasycomisiones/senadores/transparencia/datos-abiertos/asuntos-entrados/json?Cpo_Codigo=All&Fechadesde=${FROM}&Fechahasta=${TO}&_format=json" \
  | jq -r '.[] | "\(.Ast_FechaDeEntradaAlCuerpo)|\(.Cpo_Codigo)|\(.Ast_Titulo)"'
```

**Diario de sesiones** (Diputados, JSON):

```bash
curl -sL --max-time 15 -A "Mozilla/5.0 ..." https://documentos.diputados.gub.uy/docs/DAdiarioSesiones.json \
  | jq -r --arg from "$FROM" '.[] | select(.SesionFecha | type == "string") | select((.SesionFecha | gsub("/"; "-")) >= $from)'
```

Para procesar el transcript de una sesión publicada, usá el extractor local:

```bash
scripts/extract-session-transcript.js --source diputados --latest \
  --out .tmp/session-transcripts/diputados-latest.json
```

El extractor descarga el PDF oficial, intenta texto nativo con `pdftotext`,
segmenta intervenciones por orador y marca `needs_multimodal: true` solo si el
PDF parece escaneado o no tiene texto suficiente. Para un PDF de Senado o de la
Biblioteca, pasá la URL directa:

```bash
scripts/extract-session-transcript.js --url "$pdf_url" --chamber "Cámara de Senadores" \
  --date "$date" --out .tmp/session-transcripts/senado.json
```

Usá IA multimodal/OCR únicamente como fallback cuando `needs_multimodal` sea
`true`; en diarios modernos de Diputados y Senado, `pdftotext` suele alcanzar y
es más verificable.

**YouTube transcript provisional** — si hay una sesión reciente en el canal
oficial pero todavía no está el Diario de Sesiones PDF, podés usar captions de
YouTube como fuente provisional:

```bash
scripts/fetch-youtube-transcript.py --url "$youtube_url" \
  --out .tmp/youtube-transcripts/session.json
```

Reglas para YouTube:

- Solo canales oficiales (`@SenadoUY`, `@DiputadosUY` o canal enlazado desde
  Parlamento/Biblioteca).
- Marcar siempre `source_label: "YouTube transcript (provisional)"`.
- Usar para temas, timestamps y detección de actores; no para citas literales
  fuertes sin confirmar contra el Diario PDF.
- Si falla por bloqueo de IP en GitHub CI, registrarlo como fuente off
  provisional y seguir con noticias/diarios disponibles.

**Leyes promulgadas** — sin JSON oficial; HTML scrape de `https://parlamento.gub.uy/documentosyleyes/leyes-promulgadas`.

### 5. Fetcheá prensa nacional

Para cada source en `data/sources.yml#press` con `status: ok`, no asumas que
la sección `/politica` es completa ni estable. Armá una lista deduplicada de
entradas:

- `source.url` — portada amplia del medio.
- `source.politics_url` — sección política/nacional si existe.
- `source.extra_urls[]` — otras secciones declaradas en `sources.yml`, si hay.

Extraé titulares + URLs + bajadas de las primeras 20-30 notas visibles por
entrada, deduplicá por URL canónica y cruzá menciones a `people` del watchlist.

Después aplicá un prefiltro de politicidad. Guardá un item de prensa como
candidato solo si tiene al menos una señal fuerte o dos señales débiles:

**Señales fuertes**
- Persona del `watchlist` o partido político identificado.
- Institución política: Presidencia, ministerio, Parlamento, Senado, Diputados,
  intendencia, Junta Departamental, Jutep, Corte Electoral, Fiscalía cuando
  involucra a autoridades públicas.
- Proceso institucional: proyecto de ley, decreto, presupuesto, Rendición de
  Cuentas, interpelación, comisión parlamentaria, votación, paro general,
  designación, renuncia, licitación o política pública.

**Señales débiles**
- La URL o breadcrumb dice política/nacional/gobierno/parlamento.
- Menciona cargos sin nombre propio: presidente, ministro/a, senador/a,
  diputado/a, intendente/a.
- Tema público con impacto estatal: salud, seguridad, educación, vivienda,
  trabajo, ambiente, energía, relaciones exteriores.

**Descartá como ruido aunque venga de una sección política**
- Policiales sin autoridad pública o política pública asociada.
- Deportes, espectáculos, clima, tránsito, tecnología de consumo, sociedad o
  historias humanas sin decisión estatal concreta.
- Promociones, newsletter, columnas genéricas sin hecho verificable.

En el raw output, incluí por qué entró:

```yaml
- source: "Subrayado"
  title: "..."
  url: "https://..."
  political_signals: ["person:Carolina Cosse", "institution:Parlamento"]
```

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
    transcripts: { items_count: 1, ok: true }
  prensa:
    ladiaria: { items_count: 8, candidates_count: 3, ok: true }
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

Un HTTP 403/timeout de una URL individual NO alcanza para declarar la fuente
off. Para fuentes con varias entradas (`url`, `politics_url`, `extra_urls`),
probá todas las entradas configuradas y solo marcá la fuente off si todas
fallan tras los niveles de fallback.

Un HTTP 200 con texto de error también cuenta como fallo de URL. Caso conocido:
Montevideo Portal `/Noticias/Politica` puede devolver `Documento no encontrado`;
eso significa URL obsoleta, no fuente caída. Usá `politics_url` o la portada
amplia y seguí con el prefiltro de politicidad.

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

Si Nivel 2 **falla por cualquier razón** — 404, dominio movido, TLS
broken en el sandbox, DNS bloqueado, timeout, body vacío — pedile a
Internet Archive un snapshot antes de declarar la fuente off:

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
