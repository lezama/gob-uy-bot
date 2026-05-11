# Prompt 02 — Fetch upcoming agenda

> Esta rutina la ejecuta el agente después de [`01-fetch-today.md`](01-fetch-today.md).
> El objetivo es **mirar adelante**: qué eventos están programados, qué leyes se votan, qué sesiones vienen.

## Objetivo

Recolectar **lo que va a pasar en los próximos 7-14 días**. Es lo que diferencia este reporte de un feed de noticias retrospectivo: te muestra qué viene.

## Pasos

### 1. Agenda de Presidencia

```bash
curl -sL https://www.gub.uy/presidencia/comunicacion/calendario-actividades
```

Extraé todos los items con fecha futura (HOY+1 hasta HOY+14). Estructura:

```yaml
- source: presidencia/agenda
  when: "2026-MM-DD HH:MM"
  title: "Encuentro Ministerial Certal 2026"
  location: "Salón de actos de Torre Ejecutiva"
  url: "https://..."
  involved: ["Orsi", "ministros"]
```

### 2. Citaciones del Senado / Diputados

Sesiones próximas y agenda parlamentaria:

```bash
curl -sL "https://parlamento.gub.uy/camarasycomisiones/senadores/noticias" \
  | grep -i "citacion\|sesion del" | head -10

curl -sL "https://parlamento.gub.uy/camarasycomisiones/representantes/noticias" \
  | grep -i "citacion\|sesion del" | head -10
```

Buscá frases tipo "CITACIÓN DE LA CÁMARA DE SENADORES PARA MAÑANA MIÉRCOLES X DE MAYO" — esas son las próximas sesiones. Estructura:

```yaml
- source: parlamento
  when: "2026-MM-DD"
  title: "Sesión Senado — tratamiento Ley X"
  url: "..."
```

### 3. Comisiones parlamentarias

Las comisiones tienen sus propias agendas. Si encontrás endpoints útiles, sumalos. Si no, marcá `data/sources.yml#parliament_committees` con `status: missing` para que humanos puedan investigar y agregar via PR.

### 4. Eventos anunciados en noticias de hoy

Cuando releés los items de [`01-fetch-today.md`](01-fetch-today.md), buscá frases como:
- "se realizará el día X"
- "está previsto para X"
- "comenzará la próxima semana"
- "ingresará al parlamento en breve"
- "se convocó a..."

Esos son eventos futuros mencionados en noticias retrospectivas. Extraelos al output de upcoming aunque la nota sea de hoy.

### 5. Output

```yaml
upcoming:
  next_24h:
    - { when: ..., title: ..., source: ..., url: ..., involved: [...] }
  next_7d:
    - { when: ..., title: ..., ... }
  next_14d:
    - { when: ..., title: ..., ... }
```

Agrupado por horizonte temporal facilita el render del timeline.

## Reglas

- ❌ **No inventes** eventos. Si la fuente no expone agenda futura, dejá la sección vacía.
- ✅ Marcá explícitamente cuando algo es **fecha confirmada** vs **fecha tentativa** (palabras como "previsto", "tentativo", "a confirmar").
- ✅ Si un evento ya pasó (revisás la agenda y la fecha es anterior a HOY), no lo incluyas en upcoming aunque esté listado.

## Próximo paso

Cuando termina, pasá a [`03-curate.md`](03-curate.md).
