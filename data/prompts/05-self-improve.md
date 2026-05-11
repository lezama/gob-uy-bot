# Prompt 05 — Self-improvement (semanal)

> Esta rutina la ejecutás aproximadamente cada 7 días, cuando el cursor de verificación de ministros completa una vuelta.
> El objetivo es **que el bot evolucione sin intervención humana**, dentro de los guardrails.

## Cuándo correr

Cuando `state.json#verification_cursor` vuelve a 0 (vuelta completa al gabinete), ejecutá esta rutina **antes** del próximo day cycle. Etiquetá el PR resultante con `human` (review obligatoria — tocás tus propios prompts).

## Qué hacer

### 1. Leé tus últimos 28 reportes

```bash
ls -t _posts/*.md | head -28
```

### 2. Métricas a calcular

Sin ejecutar código pesado — son simples greps + conteos:

- **Fuentes que fallaron**: cuántas veces apareció `sources_off` y cuáles. Si una está fallando ≥5 ciclos, considerar mover a `_quarantine` permanente en `data/sources.yml`.
- **Top stories repetitivas**: ¿estás destacando el mismo ministerio constantemente? Eso puede indicar bias en los criterios de [`03-curate.md`](03-curate.md).
- **Diversidad política**: ¿qué proporción de top stories involucra personas del oficialismo vs oposición? Si > 80% en una dirección **y la realidad política no lo justifica** (e.g. no hubo crisis), es señal de sesgo de fuentes que el bot no compensó.
- **Glossary terms** que aparecen repetidamente: si un mismo término se define en cada reporte, considerar moverlo a una página `como-funciona.html` permanente y solo linkear desde el reporte.
- **Errores recurrentes**: items que humanos corrigieron en PRs (mirar diffs de PRs `human`-labeled). Esos errores se evitan ajustando prompts.

### 3. Issues abiertos del público

```bash
gh issue list --label suggestion --state open
```

¿Hay sugerencias acumuladas de PRs anteriores? Considerar incorporar las que tengan ≥3 reactions positivas.

### 4. Generá la propuesta

Abrí UN PR con título `[meta] reflexión semana N` que puede tocar:

- `data/prompts/03-curate.md` — ajustar criterios si detectaste sesgo o gap
- `data/prompts/01-fetch-today.md` — agregar/quitar fuentes
- `data/sources.yml` — quarantinar URLs muertas o agregar nuevas oficiales
- `.github/copilot-instructions.md` — refinar reglas si encontraste edge case
- `como-funciona.html` (si proponés crear página educativa permanente para términos repetidos)

**Body del PR debe explicar**:
- Qué métricas viste (con números: "X fuentes fallaron, Y top stories sobre tema Z")
- Qué cambiás y por qué
- Qué riesgo introduce (¿podría sesgarse en otra dirección?)
- Qué medirías el próximo ciclo para confirmar que funcionó

### 5. NO incluir en este PR

- Cambios al render layout (eso es UI, va por PR humano separado)
- Cambios a workflows (`.github/workflows/`) — alta sensibilidad, NO autocambiar
- Cambios a `LICENSE`, `README.md`, `CONTRIBUTING.md` — ámbito del mantenedor humano
- Eliminación de fuentes (cuarentenar sí, eliminar no)
- Eliminación de personas del watchlist (mover a `history` sí, eliminar no)

### 6. Después del PR

- Comentá en el PR: link a tu `state.json` log con las métricas que motivaron la propuesta
- Esperá 7 días de review humano antes de asumir merge
- Si no hay feedback en 7 días, comentá "ping" una vez y esperá otros 7 días
- Si luego de 14 días sin acción, cerrá el PR con comentario: "auto-cerrando, sin feedback. Reabro si en próxima reflexión persisten métricas que motivaron este PR."

## Filosofía

El bot **propone**, los humanos **disponen** sobre cambios meta. Esa asimetría es deliberada: cambios a los prompts y al watchlist afectan TODOS los ciclos futuros, así que merecen un check humano. Los reportes diarios son output efímero — esos sí podés auto-mergear.

**Si pensás que esta rutina misma (este archivo) está mal**, también podés proponer cambios — en un PR separado titulado `[meta-meta] mejora a la rutina de auto-mejora`.
