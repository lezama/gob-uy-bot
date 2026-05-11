# gob-uy-bot 🤖🇺🇾

**Democratizar el acceso a la política uruguaya:** una visualización diaria, scannable de un vistazo, de qué hizo el gobierno hoy y qué viene en los próximos días — para ciudadanos comunes, no para insiders.

🌐 **Sitio en vivo:** https://lezama.github.io/gob-uy-bot/

## Misión

El sistema político uruguayo (gobierno, parlamento, ministerios, comisiones, leyes) es público pero opaco. Las fuentes oficiales existen y son abiertas, pero están dispersas, escritas en jerga, y son retrospectivas. Este bot **agrega, traduce, contextualiza y mira hacia adelante** — para que cualquier persona pueda entender qué está pasando con su gobierno sin tener que ser periodista política.

Cada item del reporte:
- Se escribe en **lenguaje claro** (sin jerga, o con jerga explicada inline)
- Linkea a la **fuente primaria** (siempre)
- Identifica a las **personas involucradas** con su rol descriptivo
- Cuando importa, agrega **contexto factual** ("primera vez desde X", "afecta a aprox. N personas")
- Distingue **lo que pasó** (retrospectivo) de **lo que viene** (forward-looking)

## Qué hace

Cada 6 horas, el bot:

1. 📥 Fetchea **lo que pasó hoy** (Presidencia, ministerios, Parlamento, prensa)
2. 📅 Fetchea **lo que viene en los próximos días** (agenda presidencial, citaciones parlamentarias, eventos anunciados)
3. 🧠 Cura los items según relevancia política
4. 🎨 Renderiza una **visualización HTML scannable** — cards por persona/ministerio, timeline de los próximos días, top stories destacadas
5. ✅ Abre un PR; si pasa los guardrails, se merge solo y Pages se actualiza

**Sin servidores. Sin API keys propias.** Solo Copilot + Actions + Pages.

## Cómo está hecho — todo en prompts editables vía PR

El "código" del bot vive en [`data/prompts/`](data/prompts/) como instrucciones markdown. Cada subrutina del agente es un archivo separado:

```
data/prompts/
├── 01-fetch-today.md      ¿qué fetchear de la actividad de hoy?
├── 02-fetch-upcoming.md   ¿qué fetchear de la agenda próxima?
├── 03-curate.md           ¿qué destacar y qué dejar fuera?
├── 04-render-day.md       ¿cómo armar la página HTML del día?
└── 05-self-improve.md     ¿cómo reflexionar y mejorar estos prompts?
```

**Si querés cambiar cómo el bot decide qué destacar:** editás `03-curate.md` y abrís un PR. Sin tocar workflows, sin tocar código. El próximo ciclo aplica tu cambio.

## Cómo colaborar (PRs bienvenidos)

Cuatro lugares concretos donde aportás valor sin tocar código:

| Quiero... | Editá | Difficulty |
|-----------|-------|-----------|
| Cambiar cómo el bot prioriza noticias | `data/prompts/03-curate.md` | 🟢 Easy |
| Agregar una fuente oficial nueva | `data/sources.yml` | 🟢 Easy |
| Mejorar el diseño del sitio | `assets/style.css`, `_layouts/*.html` | 🟡 Med |
| Agregar una nueva sección a la viz | `data/prompts/04-render-day.md` | 🟡 Med |
| Agregar una persona al watchlist | `data/sources.yml` (sección `people`) | 🟢 Easy |
| Reportar un bias en el reporte | abrir [issue](../../issues/new/choose) | 🟢 Easy |

**Los PRs que solo tocan `data/prompts/` o `data/sources.yml` se mergean automáticamente** después de 1 aprobación humana o 24h sin objeciones (TBD vía workflow).

Ver [`CONTRIBUTING.md`](CONTRIBUTING.md) para detalle.

## Auto-mejora

Cada ~7 días el bot abre un PR de meta-reflexión: revisa sus reportes pasados, mide qué fuentes fallaron, qué stories pasó por alto, y propone cambios a sus propios prompts. Esos PRs requieren review humano (los reportes diarios no).

## Comparado con [`uy-gov-inbox`](https://github.com/lezama/uy-gov-inbox)

| | `gob-uy-bot` (este) | `uy-gov-inbox` |
|---|---|---|
| Stack | GitHub nativo (Copilot + Actions + Pages) | WordPress Playground + Data Machine + agents-api + Anthropic |
| Output | Visualización HTML scannable + forward-looking | Reporte markdown narrativo retrospectivo |
| Programación | Prompts en `.md`, editables via PR | Bundle JSON + PHP handlers |
| Costo | Copilot Pro ($10/mes) | Anthropic API key (~$5-15/mes) |
| Infra | Cero | WordPress Playground en CI |

Son **dos enfoques al mismo problema**, vivos en paralelo para comparar.

## Licencia

MIT. Datos públicos de [gub.uy](https://www.gub.uy) y [parlamento.gub.uy](https://parlamento.gub.uy).
