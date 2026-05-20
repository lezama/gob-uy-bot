#!/usr/bin/env node
// Extract a parliamentary session transcript from an official PDF.
//
// Default mode fetches the latest Chamber of Representatives diary from the
// official open-data JSON and extracts embedded PDF text with pdftotext.
// If the PDF is scanned or text extraction is too sparse, the output marks
// `needs_multimodal: true` so a later OCR/multimodal step can take over.

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");

const DEFAULT_DIPUTADOS_JSON = "https://documentos.diputados.gub.uy/docs/DAdiarioSesiones.json";
const UA = "Mozilla/5.0 (compatible; gob-uy-bot/1.0; +https://github.com/lezama/gob-uy-bot)";

const args = process.argv.slice(2);

function argValue(name, fallback = null) {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage(exitCode = 0) {
  console.error(`usage:
  scripts/extract-session-transcript.js --source diputados --latest [--out .tmp/session-transcript.json]
  scripts/extract-session-transcript.js --url <pdf-url> [--date YYYY-MM-DD] [--chamber Senado|Diputados] [--out file.json]

options:
  --pages N      only extract first N pages, useful for quick tests
  --mode MODE    layout|raw|auto; auto uses raw for Senado interventions
  --out FILE     write JSON output; defaults to stdout
`);
  process.exit(exitCode);
}

if (hasFlag("--help")) usage(0);

function ensureTool(tool) {
  const result = spawnSync("which", [tool], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${tool} is required. Install poppler (macOS: brew install poppler; Ubuntu: apt-get install poppler-utils).`);
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`GET ${url} failed: HTTP ${response.status}`);
  return response.json();
}

async function download(url, outPath) {
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`GET ${url} failed: HTTP ${response.status}`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const file = fs.createWriteStream(outPath);
  await new Promise((resolve, reject) => {
    response.body.pipeTo(new WritableStream({
      write(chunk) {
        file.write(Buffer.from(chunk));
      },
      close() {
        file.end(resolve);
      },
      abort(err) {
        file.destroy();
        reject(err);
      },
    })).catch(reject);
  });
}

function normalizeDate(value) {
  if (!value) return null;
  const text = String(value);
  const slash = text.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (slash) return `${slash[1]}-${slash[2]}-${slash[3]}`;
  const dash = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dash) return text;
  return text;
}

function extractText(pdfPath, pagesLimit, mode = "layout") {
  const args = mode === "raw" ? ["-raw"] : ["-layout"];
  if (pagesLimit) args.push("-f", "1", "-l", String(pagesLimit));
  args.push(pdfPath, "-");
  const result = spawnSync("pdftotext", args, {
    encoding: "utf8",
    maxBuffer: 80 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`pdftotext failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.replace(/\r/g, "");
}

function compactWhitespace(text) {
  return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function parseOrderOfDay(text) {
  const match = text.match(/-\s*ORDEN DEL D[ÍI]A\s*-([\s\S]{0,6000}?)(?:\f|\n\s*VIRGINIA|\n\s*SUMARIO|\n\s*\d+\s+C[ÁA]MARA)/i);
  if (!match) return [];
  return match[1]
    .split(/\n(?=\s*\d+[ºo.-]\s*-?)/)
    .map((item) => compactWhitespace(item))
    .filter((item) => /^\d+/.test(item))
    .map((item) => item.replace(/\s+/g, " "));
}

function parseSummaryTopics(text) {
  const match = text.match(/\n\s*SUMARIO\s*\n([\s\S]{0,9000}?)(?:\f|\n\s*MEDIA HORA PREVIA|\n\s*SE[ÑN]OR[ A-ZÁÉÍÓÚÑÜ()]+?\.-)/i);
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => compactWhitespace(line))
    .filter((line) => /^\d+/.test(line) || /^[-–—]\s+/.test(line))
    .slice(0, 40);
}

function normalizeSpeaker(rawTitle, rawName) {
  const title = compactWhitespace(rawTitle || "");
  const name = compactWhitespace(rawName || "");
  return compactWhitespace(`${title}${name ? ` ${name}` : ""}`)
    .replace(/\s+\)/g, ")")
    .replace(/\(\s+/g, "(");
}

function parseInterventions(text) {
  const lines = text.split("\n");
  const interventions = [];
  let current = null;
  const speakerRe = /^\s*(SEÑOR(?:A)?(?:\s+PRESIDENT[EA]|\s+SECRETARI[OA]|\s+MINISTR[OA])?|SEÑOR(?:A)?)\s*([^.\n]{0,140}?)\.-\s*(.*)$/i;

  for (const line of lines) {
    const match = line.match(speakerRe);
    if (match) {
      if (current) interventions.push(current);
      current = {
        speaker: normalizeSpeaker(match[1].toUpperCase(), match[2]),
        text: match[3] ? `${match[3]}\n` : "",
      };
      continue;
    }
    if (current) current.text += `${line}\n`;
  }
  if (current) interventions.push(current);

  return interventions
    .map((item) => ({
      speaker: item.speaker,
      text: compactWhitespace(item.text),
      chars: compactWhitespace(item.text).length,
    }))
    .filter((item) => item.chars >= 20);
}

function countBySpeaker(interventions) {
  const counts = new Map();
  for (const item of interventions) {
    const prev = counts.get(item.speaker) || { speaker: item.speaker, interventions: 0, chars: 0 };
    prev.interventions += 1;
    prev.chars += item.chars;
    counts.set(item.speaker, prev);
  }
  return [...counts.values()].sort((a, b) => b.chars - a.chars).slice(0, 20);
}

async function resolveInput() {
  const directUrl = argValue("--url");
  if (directUrl) {
    return {
      url: directUrl,
      metadata: {
        chamber: argValue("--chamber", null),
        date: normalizeDate(argValue("--date", null)),
        source: "direct_pdf",
      },
    };
  }

  const source = argValue("--source", "diputados");
  if (source !== "diputados") {
    throw new Error(`unsupported --source ${source}; use --url for Senado PDFs for now`);
  }
  if (!hasFlag("--latest")) usage(1);

  const rows = await fetchJson(DEFAULT_DIPUTADOS_JSON);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("DAdiarioSesiones.json returned no rows");
  const latest = rows
    .slice()
    .sort((a, b) => String(b.SesionFecha).localeCompare(String(a.SesionFecha)))[0];

  return {
    url: latest.URL,
    metadata: {
      chamber: "Cámara de Representantes",
      date: normalizeDate(latest.SesionFecha),
      legislature: latest.Legislatura,
      period: latest.Periodo,
      session: latest.Sesion,
      session_type: latest.SesionTipo,
      diary: latest.Diario,
      source: DEFAULT_DIPUTADOS_JSON,
    },
  };
}

(async () => {
  ensureTool("pdftotext");

  const input = await resolveInput();
  const out = argValue("--out", null);
  const pagesLimit = argValue("--pages", null);
  const hash = createHash("sha1").update(input.url).digest("hex").slice(0, 12);
  const pdfPath = path.join(process.cwd(), ".tmp", "session-transcripts", `${hash}.pdf`);

  await download(input.url, pdfPath);
  const layoutText = extractText(pdfPath, pagesLimit, "layout");
  const modeArg = argValue("--mode", "auto");
  const interventionMode = modeArg === "auto"
    ? (/senadores?/i.test(input.metadata.chamber || "") ? "raw" : "layout")
    : modeArg;
  if (!["layout", "raw"].includes(interventionMode)) {
    throw new Error("--mode must be layout, raw, or auto");
  }
  const interventionText = interventionMode === "layout"
    ? layoutText
    : extractText(pdfPath, pagesLimit, "raw");
  const cleanText = compactWhitespace(interventionText);
  const interventions = parseInterventions(interventionText);

  const result = {
    ...input.metadata,
    url: input.url,
    pdf_path: pdfPath,
    extraction: {
      method: `pdftotext:${interventionMode}`,
      pages_limit: pagesLimit ? Number(pagesLimit) : null,
      chars: cleanText.length,
      layout_chars: compactWhitespace(layoutText).length,
      interventions_count: interventions.length,
      needs_multimodal: cleanText.length < 2000 || interventions.length === 0,
    },
    order_of_day: parseOrderOfDay(layoutText),
    summary_topics: parseSummaryTopics(layoutText),
    speakers: countBySpeaker(interventions),
    interventions: interventions.slice(0, 80),
  };

  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (out) {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, json);
    console.error(`WROTE ${out}`);
  } else {
    process.stdout.write(json);
  }
})().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
