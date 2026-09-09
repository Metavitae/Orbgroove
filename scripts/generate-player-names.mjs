// Calls OpenRouter's free-tier Llama 3.3 70B to generate a fresh batch of
// funny solo/group dancer names for HDYD, validates the shape, and writes
// the result to the path given as argv[2] (a checkout of the public
// hdyd-content repo). Exits nonzero on any failure so the workflow never
// commits bad data — the last known-good file stays in place.

const OUTPUT_PATH = process.argv[2];
if (!OUTPUT_PATH) {
  console.error("Usage: node generate-player-names.mjs <output-path>");
  process.exit(1);
}

const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) {
  console.error("OPENROUTER_API_KEY is not set");
  process.exit(1);
}

// Priority-ordered fallback chain: OpenRouter tries each in order and moves
// to the next on rate-limiting, downtime, or moderation errors (native
// `models` array behavior — no custom retry logic needed). OpenRouter caps
// this array at 3 entries (confirmed via live 400 response, undocumented as
// of writing).
//
// Refreshed 2026-09-09: the previous chain's first two entries
// (meta-llama/llama-3.3-70b-instruct:free, qwen/qwen3-next-80b-a3b-instruct:free)
// had been silently removed from OpenRouter's catalog, so gemma-4-31b-it was
// the only model ever actually reachable despite looking like a 3-model
// fallback. Confirmed current models via https://openrouter.ai/api/v1/models.
const MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
];
const SOLO_COUNT = 24;
const GROUP_COUNT = 24;
const MAX_NAME_LENGTH = 40;

const SYSTEM_PROMPT = `You write short, funny player names for a party dance-guessing game called HDYD (How Do You Dance?). Players pick a joke name before performing.

Tone: playful wordplay and pop-culture-adjacent puns, dance-related humor, relatable "embarrassing moment" humor. Think pun riffs on celebrity names, dance moves gone wrong, and everyday awkwardness.

Examples of the exact tone wanted:
Solo names: "Two Left Feets", "Reluctant Baryshnikov", "Twerkulese", "Fred Astep", "Shakira Shakira", "John Travoltage", "Beyonslay"
Group names: "The Wobbling Dead", "WiFi Password", "Unexpected Turbulence", "Technically Dancing", "The Reluctant Beyoncés", "Sober at a Wedding"

Rules:
- Keep it family-friendly (PG) — no profanity, no sexual content, no hateful or mean-spirited content, nothing targeting a real private individual.
- Celebrity/pop-culture puns should be clearly jokes, not literal real names.
- Each name should be 1-5 words, under ${MAX_NAME_LENGTH} characters.
- No duplicates within or across the two lists.
- Respond with ONLY a single JSON object, no markdown fences, no commentary, in exactly this shape:
{"solo": ["...", "..."], "group": ["...", "..."]}`;

const USER_PROMPT = `Generate ${SOLO_COUNT} solo dancer names and ${GROUP_COUNT} group dancer names, following the system instructions exactly.`;

function extractJson(raw) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in model output");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function validateList(list, label, expectedCount) {
  if (!Array.isArray(list)) {
    throw new Error(`"${label}" is not an array`);
  }
  const cleaned = [];
  const seen = new Set();
  for (const entry of list) {
    if (typeof entry !== "string") continue;
    const name = entry.trim();
    if (!name || name.length > MAX_NAME_LENGTH) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(name);
  }
  if (cleaned.length < Math.floor(expectedCount * 0.5)) {
    throw new Error(
      `"${label}" only had ${cleaned.length} valid names after cleanup (expected ~${expectedCount})`
    );
  }
  return cleaned;
}

async function main() {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/Metavitae/hdyd-content",
      "X-Title": "HDYD daily player names",
    },
    body: JSON.stringify({
      models: MODELS,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT },
      ],
      temperature: 0.9,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter request failed: ${response.status} ${body.slice(0, 1500)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error(`Unexpected OpenRouter response shape: ${JSON.stringify(data).slice(0, 500)}`);
  }
  console.log(`Model used: ${data?.model ?? "unknown"}`);

  const parsed = extractJson(content);
  const solo = validateList(parsed.solo, "solo", SOLO_COUNT);
  const group = validateList(parsed.group, "group", GROUP_COUNT);

  const output = {
    generatedAt: new Date().toISOString(),
    solo,
    group,
  };

  const { writeFileSync } = await import("node:fs");
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");
  console.log(`Wrote ${solo.length} solo + ${group.length} group names to ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error("generate-player-names failed:", err.message);
  process.exit(1);
});
