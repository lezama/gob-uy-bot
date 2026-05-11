# Modelo de seguridad de gob-uy-bot

Este repo es **un loop autónomo** donde GitHub Copilot Cloud Agent escribe
y mergea código sin intervención humana. Esa autonomía tiene riesgos. Este
documento los lista honestamente y describe las mitigaciones activas.

## Principio rector

> Mantener autonomía completa del loop **sin que el agent pueda dañar el repo,
> exfiltrar secretos, o comprometer la calidad del contenido publicado.**

## Qué puede hacer el agent (capability surface)

- Crear branches con prefijo `copilot/...`
- Editar archivos del repo (cualquier path)
- Abrir, marcar como ready, etiquetar y mergear PRs
- Ejecutar comandos en su propio sandbox de CI con acceso a:
  - Repository contents
  - `GITHUB_TOKEN` con permisos del workflow del agent
  - Network access a los dominios del **Custom allowlist** del firewall
- Cerrar issues que le fueron asignados

Lo que el agent NO puede hacer:

- Acceder a otros repos de la cuenta (`COPILOT_PAT` es fine-grained, scope = solo este repo)
- Leer secretos del repo a menos que un workflow se los pase explícitamente
- Modificar settings del repo (Settings UI)
- Hacer push directo a `main` (todo va por PR)
- Asignar PRs como reviewers (no tiene ese permiso)

## Riesgos y mitigaciones

### R1 — Workflow injection (el agent agrega/modifica un workflow malicioso)

**Vector:** Copilot decide modificar `.github/workflows/*` o agregar uno nuevo. Ese workflow correría con `GITHUB_TOKEN` y secretos del repo en su próximo trigger.

**Mitigaciones:**

1. `copilot-auto-merge.yml` tiene **allowlist estricta** (solo `_posts/`, `data/state.json`, `_data/`). Cualquier PR que toque `.github/` queda con label `needs-review` y NO se auto-mergea.
2. `copilot-auto-merge.yml` tiene **danger list explícita** que rechaza por path con mensaje específico.
3. `audit-after-merge.yml` abre issue de auditoría si CUALQUIER ruta sensible aparece en `main`, por cualquier vía (PR del bot, push humano, otro contributor). Es un canario, no bloquea, pero te enterás en minutos.
4. Nuestro `copilot-instructions.md` instruye explícitamente al agent: "Nunca push directo a `main`. Si proponés cambios a prompts o workflows, va por PR humano-revisable."

**Riesgo residual:** un workflow malicioso agregado en una branch del agent corre en el contexto del PR antes de que el guardrail lo rechace. GitHub Actions limita los permisos por default a `read` para PRs, pero si tenés `write` global, puede explotarse. **Mitigación adicional recomendada:** Settings → Actions → General → Workflow permissions → "Read repository contents and packages permissions" (default). Para los workflows propios que necesitan write, declarar `permissions:` explícitamente al nivel del job.

### R2 — Exfiltración vía Custom allowlist

**Vector:** uno de los 8 dominios del allowlist (gub.uy, parlamento.gub.uy, ladiaria.com.uy, etc.) se compromete y sirve contenido malicioso o recibe payloads con datos del sandbox.

**Mitigaciones:**

1. Firewall `Enable: ON` — bloquea todo lo no listado.
2. El sandbox del agent NO tiene acceso a tu cuenta personal, otros repos, ni shells externos. El blast radius está limitado al sandbox.
3. Los dominios listados son todos del Estado uruguayo o medios reconocidos — superficie pequeña.

**Riesgo residual:** bajo. Para hardening adicional, podés acotar más a paths específicos (ej. `https://www.gub.uy/presidencia/comunicacion/noticias/` en lugar de `www.gub.uy`).

### R3 — Self-degradation de prompts

**Vector:** el agent (vía rutina `05-self-improve.md`) abre PRs modificando sus propios prompts y los degrada (relaja criterios, agrega fuentes no verificadas, baja la barra de curación).

**Mitigaciones:**

1. PRs que tocan `data/prompts/*` están en danger list → no auto-mergean.
2. Quedan en `needs-review` esperando review humano explícito.
3. `audit-after-merge.yml` te avisa si alguno llegó a `main` por cualquier ruta.

### R4 — Información incorrecta publicada en Pages

**Vector:** el agent alucina datos, cita mal, atribuye incorrectamente. Eso queda en `main` + indexable por Google.

**Mitigaciones:**

1. Prompt `04-render-day.md` exige `quote: cita literal`, `url: fuente primaria`, glosario inline para términos técnicos, y prohíbe explícitamente inferir intención política.
2. Issue template `report-feedback.yml` permite a cualquiera reportar errores específicos.
3. `auto-merge` rechaza PRs con frontmatter YAML inválido.

**Riesgo residual:** sin validación semántica, una alucinación verosímil pasa. La defensa principal es **transparencia + colaboración** — el sitio invita explícitamente a corregirlo via PR.

### R5 — `COPILOT_PAT` exfiltrado

**Vector:** el secret se filtra por log accidentalmente o por compromiso del workflow.

**Mitigaciones:**

1. PAT es **fine-grained**, scope = solo `lezama/gob-uy-bot`. Si se exfiltra, el blast radius es solo este repo.
2. Permisos limitados al mínimo necesario: Issues + PRs + Contents (write) + Metadata (read).
3. Secret scanning está ON — GitHub te avisa si commiteás un patrón que parece secret.
4. El PAT solo se usa en el step `gh issue edit ... --add-assignee` del cron. No se pasa al sandbox del agent.

**Hardening recomendado:** rotar el PAT cada 6 meses. Setear expiration al crearlo.

### R6 — Costos descontrolados

**Vector:** algún bug del cron crea muchos issues, o el agent entra en loop de retries, consumiendo premium requests más rápido de lo esperado.

**Mitigaciones:**

1. Cron limitado a `0 */6 * * *` (4 veces/día). Si necesita ajustarse, hacelo en el workflow.
2. **Recomendación:** setear spending limit en Copilot — https://github.com/settings/billing/spending_limit. Cap a $5/mes te frena automáticamente.

## Settings UI a revisar (no se pueden poner en este repo)

| Setting | URL | Recomendado |
|---------|-----|-------------|
| Workflow permissions | `Settings → Actions → General → Workflow permissions` | "Read repository contents and packages permissions" (default permissive es write — bajalo) |
| Allow Actions from marketplace | `Settings → Actions → General → Allowed actions` | "Allow specified actions" → solo `actions/*, github/*, Extra-Chill/*` (lo que usás explícitamente) |
| Spending limit Copilot | `Settings → Billing → Spending limit` | Cap mensual ($5-10) |
| Notifications del repo | `Watch → All activity` (top-right del repo) | ON — para enterarte rápido de PRs auto-mergeados |

## Cómo responder a un alerta de audit

1. Abrir el issue auto-creado por `audit-after-merge.yml` (label `audit`)
2. Mirar el commit que cita
3. Si el cambio es legítimo (ej. fuiste vos haciendo PR humano), cerrá el issue
4. Si no es legítimo:
   ```bash
   gh repo clone lezama/gob-uy-bot
   cd gob-uy-bot
   git revert <sha-del-commit>
   git push
   ```
5. Si parece compromiso del agent o del PAT: rotar `COPILOT_PAT`, revisar logs de Actions, considerar pausar el cron temporalmente (`gh workflow disable cron-trigger.yml`)

## Glosario de threat model

- **Loop autónomo:** todo el flujo (cron → issue → agent → PR → merge → Pages) sin intervención humana.
- **Guardrail:** chequeo automático que rechaza/flagea sin bloquear el flujo. Pre-merge.
- **Audit:** chequeo después del merge que avisa pero no bloquea. Post-merge.
- **Fine-grained PAT:** Personal Access Token con scope acotado a un solo repo, no a la cuenta entera.
