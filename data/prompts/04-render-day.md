# Prompt 04 — Render the day's visualization

> Esta rutina toma el output curado de [`03-curate.md`](03-curate.md) y produce el archivo del día.
> **Escribilo con lenguaje claro y fuentes linkeadas.** Si usás un término técnico, explicalo inline.

## Misión

Democratizar el acceso a la política uruguaya. Tu reporte tiene que ser **escaneable de un vistazo + comprensible sin conocimiento previo del sistema político**. Si una persona que no sabe qué es una "media hora previa" o qué hace el "MEF" entra a la página, tiene que poder entender qué pasó.

## Estructura del archivo

Generá `_posts/YYYY-MM-DD-cycle-N.md` con esta estructura exacta. Jekyll lo va a renderizar usando `_layouts/post.html` (que define cards, timeline, etc).

```markdown
---
title: "Hoy en el gobierno uruguayo — DD de mes de YYYY"
date: YYYY-MM-DD HH:MM:SS -0300
layout: report
cycle: <número del state.json>
window:
  from: "YYYY-MM-DD"
  to: "YYYY-MM-DD"
verification_subject:
  ministry: "Educación y Cultura"
  minister: "José Carlos Mahía"
  result: "ok | drift | error"
top_stories:
  - title: "..."
    summary: "1 línea explicativa, sin jerga"
    quote: "cita literal opcional, < 25 palabras"
    url: "https://..."
    source_label: "Presidencia | MEF | Senado | La Diaria | ..."
    when: "2026-MM-DD HH:MM"
    people:
      - name: "Yamandú Orsi"
        role: "Presidente"
    context_glossary:
      - term: "Rendición de Cuentas"
        explain: "Ley anual que ajusta el presupuesto en función de cómo va el año."
upcoming:
  next_24h:
    - { when, title, where, source_url, who }
  next_7d:
    - { when, title, where, source_url, who }
  next_14d:
    - { when, title, where, source_url, who }
ministry_feed:
  - ministry: "Interior"
    minister: "Carlos Negro"
    items:
      - { time, title, url, summary }
  - ministry: "..."
    items: [...]
parlamento:
  asuntos_entrados:
    - { codigo, fecha, titulo, camara, url }
  sesiones:
    - { fecha, sesion, tipo, pdf }
  leyes_promulgadas:
    - { numero, fecha, titulo, url }
quiet:
  - "Ministerios sin novedades hoy: Turismo, ..."
sources_off:
  - { source: "...", reason: "404 since 2026-MM-DD" }
---

(El cuerpo del .md queda vacío o con un párrafo de bienvenida — el layout
renderiza todo desde el frontmatter.)
```

## Reglas de accesibilidad (críticas)

### 1. Glosario inline

Cualquier término que un ciudadano común podría no entender va con `context_glossary`. Ejemplos:

- "Rendición de Cuentas" → "Ley anual que ajusta el presupuesto..."
- "Media hora previa" → "Espacio al inicio de cada sesión donde legisladores hablan de temas libres."
- "ASSE" → "Administración de Servicios de Salud del Estado — la red pública de salud."
- "MEF" → "Ministerio de Economía y Finanzas."
- "FA" / "PN" / "PC" → "Frente Amplio / Partido Nacional / Partido Colorado."
- "Comisión de X" → breve descripción de qué hace esa comisión.

**No abuses** — solo definí lo que verdaderamente puede ser opaco. Si decís "el Presidente recorrió la fábrica X", no necesitás definir "Presidente".

### 2. Contexto sobre personas

Cuando una persona aparezca en `top_stories.people`, su `role` debe ser descriptivo:
- ✅ "Senadora del FA — integrante de Comisión de Presupuesto"
- ❌ "Senadora"

Esto convierte cards en mini-tarjetas educativas.

### 3. "Por qué importa" (opcional, frugal)

En `top_stories`, podés agregar un campo `why_it_matters` con UNA frase factual (no opinión) que ayude al lector a dimensionar:

- ✅ "Es la primera vez desde 2019 que se trata este punto."
- ✅ "Afecta a aprox. 200.000 trabajadores del sector privado."
- ❌ "Es una mala decisión que va a generar conflicto." (opinión, no)

Si no podés escribir un `why_it_matters` factual, omitilo.

### 4. Lenguaje claro

- Frases cortas. Sujeto + verbo + complemento.
- Evitá nominalizaciones ("la realización del acto" → "el acto se realizó").
- Si una declaración política es importante: cita literal entre comillas, atribución explícita, link a fuente. NUNCA parafrasees declaraciones.

## Próximo paso

Cuando termina, actualizá `data/state.json` (incrementá `cycle`, avanzá cursor de verificación, marcá `last_run`, agregá entry al `verification_log`). Después abrí el PR.
