# Cómo colaborar con gob-uy-bot

> Este repo está hecho para que cualquiera pueda mejorarlo. **No necesitás ser desarrollador.** La mayoría de las mejoras útiles son ediciones a archivos `.md` o `.yml`.

## Lo más útil

### 🟢 Sin código

| Quiero... | Editá | Cómo |
|-----------|-------|------|
| Sugerir una fuente nueva | [`data/sources.yml`](data/sources.yml) | Agregá un bloque siguiendo el formato existente |
| Que un término se explique | [`data/sources.yml`](data/sources.yml) — sección `glossary` | Agregá `{ term, explain }` |
| Cambiar cómo el bot prioriza | [`data/prompts/03-curate.md`](data/prompts/03-curate.md) | Editá los criterios |
| Agregar una persona al watchlist | [`data/sources.yml`](data/sources.yml) — sección `people` | Seguí el formato |
| Mejorar la guía educativa | [`como-funciona.md`](como-funciona.md) | Editá libremente |

### 🟡 Con un poco de HTML/CSS

| Quiero... | Editá |
|-----------|-------|
| Mejorar el diseño visual | [`assets/style.css`](assets/style.css) |
| Cambiar el render de un reporte | [`_layouts/report.html`](_layouts/report.html) |
| Cambiar el header/footer | [`_includes/header.html`](_includes/header.html), [`_includes/footer.html`](_includes/footer.html) |
| Cambiar la home | [`index.html`](index.html) |

### 🔴 Cambios que requieren review más cuidadoso

- Workflows en [`.github/workflows/`](.github/workflows/) — afectan ejecución automática
- [`.github/copilot-instructions.md`](.github/copilot-instructions.md) — afecta TODOS los reportes futuros

## Flujo de PR

1. **Fork + branch** — o usá el botón "Edit" de GitHub directamente para cambios de un solo archivo.
2. **Commit message** — claro y conciso. En español o inglés, ambos OK.
3. **PR title** — describí qué cambia. Ej: `add: ANEP como fuente oficial` o `fix: criterio de top stories sobre recalls`.
4. **PR body** — explicá el por qué. Si linkeás a un reporte específico que motivó el cambio, mejor.

## Auto-merge

Algunos PRs se mergean **automáticamente** después de checks:

- ✅ PRs del bot Copilot que tocan solo el archivo del día en `_posts/` con frontmatter válido
- ❌ PRs humanos siempre requieren al menos 1 review

Detalles en [`.github/workflows/merge.yml`](.github/workflows/merge.yml).

## Reportar errores y sesgos

Si viste un reporte que omitió algo importante, destacó algo trivial, o muestra un sesgo:

- Abrí un [issue de feedback](../../issues/new?template=report-feedback.yml)
- Mencioná **el reporte específico** (link) y **qué exactamente** te resultó mal

El feedback es la principal entrada para ajustar los prompts por PR.

## Código de conducta

- **Buena fe.** Asumí que la otra persona quiere mejorar el proyecto.
- **Sin trolling político.** El bot busca ser útil para todo el espectro. PRs que introducen sesgo serán rechazados.
- **Datos públicos solamente.** Nunca incluyas información personal (DNIs, teléfonos, direcciones particulares) aunque sea de figuras públicas.
- **Linkeá fuentes.** Si afirmás algo, linkeá la fuente primaria.

## ¿Dudas?

Abrí un issue con la etiqueta `question`.
