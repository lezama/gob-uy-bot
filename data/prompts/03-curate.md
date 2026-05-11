# Prompt 03 — Curate

> Esta rutina decide **qué destacar y qué dejar fuera**. Es la única opinión editorial del bot.
> Si el bot está priorizando mal, **editá este archivo via PR**. Es el principal vector de mejora.

## Objetivo

Tomás los items crudos de `01-fetch-today.md` + `02-fetch-upcoming.md` y los clasificás en 3 niveles:

- 🔥 **Top stories** (3-5 max) — lo que pondrías en una portada
- 🟡 **Medio** — relevante pero no portada; va al feed por ministerio
- ⚪ **Bajo / ruido** — no se incluye en la viz

## Criterios para Top Stories

**SÍ va a top:**

- Decisiones del Consejo de Ministros publicadas oficialmente
- Anuncios de política exterior (acuerdos, posiciones, tensiones diplomáticas)
- Cambios de gabinete (renuncias, designaciones, sustituciones)
- Conflictos internos del partido de gobierno o de oposición visibles
- Proyectos de ley con impacto macro (presupuesto, reforma tributaria, salud, seguridad social, educación)
- Crisis sanitarias (brotes, alertas), de seguridad (estados de emergencia), o sociales (paros generales)
- Sesiones parlamentarias clave (votaciones cerradas, interpelaciones, declaraciones notables)
- Decisiones judiciales que afecten al gobierno o a políticos
- Cuando un ministro/político hace declaración pública sobre un tema controvertido

**NO va a top:**

- Recalls de productos comerciales (autos, alimentos, medicamentos) — al medio si afectan a muchos, descartar si rutinario
- Comunicados administrativos (cambios de horario, mantenimientos, recordatorios)
- Eventos protocolares sin contenido (entregas de premios, visitas guiadas, conmemoraciones genéricas)
- Notas de servicio público (vacunación, trámites)
- Items donde no se puede identificar un actor político concreto

## Criterios para "Próximos días"

Para la sección upcoming, priorizá:

- ✅ Sesiones parlamentarias con tema concreto identificable
- ✅ Reuniones internacionales (cumbres, bilaterales, viajes oficiales del Presidente)
- ✅ Plazos legales / vencimientos (envío de Rendición de Cuentas, presentación de proyectos)
- ✅ Eventos del Consejo de Ministros
- ✅ Conferencias de prensa anunciadas

Bajá:
- Eventos protocolares sin sustancia
- Convocatorias internas
- Eventos de un ministerio que no involucran al ministro

## Cruce con personas del watchlist

Al curar, marcá explícitamente qué **personas del `data/sources.yml#people`** aparecen en cada item destacado. Eso permite filtros y vistas por persona en la viz.

## Reglas

- ❌ **No inferir intención** — "X dijo que Y porque busca Z". Citá lo que dijo, no por qué.
- ❌ **No agregar opiniones** — "esto es importante porque..." no, dejalo al lector.
- ✅ **Sí podés** indicar contexto factual ("primera vez desde 2019 que se trata X")
- ✅ **Diversidad** — si todos los top son del mismo color político en un día, considerá si es un sesgo de las fuentes o un sesgo tuyo. Apuntalo en `state.json#bias_log` para revisión semanal.

## Output

```yaml
top_stories:
  - { title: ..., url: ..., source: ..., people: [...], context_line: "1 frase opcional" }
medio:
  - { ministerio: "X", items: [...] }
quiet_ministries:
  - "lista de ministerios sin nada destacable hoy"
```

## Próximo paso

Pasá a [`04-render-day.md`](04-render-day.md).
