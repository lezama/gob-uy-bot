---
layout: default
title: Metodología
permalink: /metodologia/
---

<div class="prose-page" markdown="1">

# Cómo funciona este bot

> Una explicación honesta de cómo se generan los reportes diarios, qué fuentes usamos, cómo decidimos qué destacar, y qué dejamos afuera. Si encontrás un error o un sesgo, [reportalo](https://github.com/lezama/gob-uy-bot/issues/new/choose).

## Cadencia: cada 6 horas

Una GitHub Action programada corre el bot cuatro veces al día (00:00, 06:00, 12:00 y 18:00 UTC, aprox. cada 6 horas). Cada corrida es un **ciclo** numerado (`ciclo #N`). En cada ciclo el bot:

1. Fetchea **actividad reciente** (Presidencia, ministerios, Parlamento, prensa).
2. Fetchea **agenda próxima** (24h, 7 días, 14 días).
3. **Cura** los items según relevancia política.
4. **Verifica cruzadamente** una declaración pública contra su fuente primaria.
5. Renderiza una **visualización HTML** y abre un PR.
6. Si pasa los guardrails automáticos, el PR se mergea y GitHub Pages publica.

Varios ciclos por día actualizan el reporte de ese día. La URL `/AAAA/MM/DD/` siempre sirve el ciclo más reciente.

## Fuentes

La lista canónica de fuentes vive en [`data/sources.yml`](https://github.com/lezama/gob-uy-bot/blob/main/data/sources.yml). Categorías:

- **Oficiales** — Presidencia, ministerios vía `gub.uy`, Parlamento vía `parlamento.gub.uy`.
- **Prensa con cobertura política** — La Diaria, El Observador, Búsqueda, Brecha, Montevideo Portal, Subrayado y otros.
- **Watchlist de personas** — figuras políticas seguidas explícitamente (Presidente, vice, ministros, líderes de partido).

Cuando una fuente falla en un ciclo (404, paywall, error de conexión), aparece nombrada en el bloque **"⚠️ Fuentes con problemas"** del reporte de ese día. No la escondemos.

## Cómo se elige qué destacar

Las reglas de curaduría viven en [`data/prompts/03-curate.md`](https://github.com/lezama/gob-uy-bot/blob/main/data/prompts/03-curate.md). En resumen, priorizamos:

- **Decisiones y declaraciones** que afectan política pública vigente, no chismes.
- **Hechos verificables** con fuente primaria linkeable.
- **Diversidad de actores** — no solo Ejecutivo: también Parlamento, oposición, organismos autónomos.
- **Forward-looking** — qué viene en las próximas 24h–14d, no solo lo retrospectivo.

Y excluimos explícitamente:

- Chismes sin fuente identificada.
- Reposteos sin información nueva.
- Encuestas de empresas sin metodología publicada.
- Reacciones de figuras menores a noticias mayores (cubrimos la noticia, no las reacciones).

## Verificación cruzada {#verificacion}

En cada ciclo el bot elige a **un funcionario** (rotando entre ministros y figuras del Ejecutivo) y verifica una declaración suya contra la fuente primaria oficial (transcripción parlamentaria, comunicado de Presidencia, video de conferencia de prensa, etc.).

El resultado aparece en el bloque **"Verificación cruzada"** del reporte:

- **✅ Las citas coinciden con la fuente oficial.** Lo que se reportó coincide con la transcripción/comunicado.
- **⚠️ Hay diferencias con la fuente oficial.** Hay paráfrasis libre, recorte de contexto, o atribuciones que no figuran en la fuente.
- **❌ No pudo verificarse.** La fuente primaria no estaba accesible (404, paywall, no se publicó aún).

Esto no garantiza que el resto del reporte sea perfecto — es una muestra. Si encontrás otra cita mal atribuida o un dato sin respaldo, [reportá un issue](https://github.com/lezama/gob-uy-bot/issues/new/choose).

## Auto-mejora

Cada ~7 días el bot abre un PR de meta-reflexión: revisa sus reportes pasados, mide qué fuentes fallaron, qué stories pasó por alto, y propone cambios a sus propios prompts. Esos PRs **requieren review humano** (los reportes diarios no).

## Limitaciones que reconocemos

- **No cubrimos lo subnacional.** Intendencias, juntas departamentales y municipios quedan afuera por ahora.
- **El Poder Judicial es de baja cobertura.** Solo reportamos resoluciones de alto impacto público.
- **Sesgo de fuente:** la prensa que cubrimos tiene posicionamientos políticos conocidos. No intentamos "balancear" artificialmente; tratamos de **linkear siempre a la fuente primaria** para que vos verifiques.
- **El bot puede equivocarse.** Por eso cada reporte tiene un botón "editá este reporte directamente" — la corrección humana es parte del proceso.

## Cómo aportar

Cuatro lugares concretos:

| Quiero... | Editá |
|---|---|
| Agregar/quitar una fuente | [`data/sources.yml`](https://github.com/lezama/gob-uy-bot/edit/main/data/sources.yml) |
| Cambiar las reglas de curaduría | [`data/prompts/03-curate.md`](https://github.com/lezama/gob-uy-bot/edit/main/data/prompts/03-curate.md) |
| Agregar un término al glosario | [`data/sources.yml`](https://github.com/lezama/gob-uy-bot/edit/main/data/sources.yml) (sección `glossary`) |
| Reportar un error o sesgo | [Abrir un issue](https://github.com/lezama/gob-uy-bot/issues/new/choose) |

Ver [CONTRIBUTING.md](https://github.com/lezama/gob-uy-bot/blob/main/CONTRIBUTING.md) para más detalle.

<p class="exit-ramp">¿Listo para leer? <a href="{{ '/' | relative_url }}">Mirá el último reporte →</a></p>

</div>
