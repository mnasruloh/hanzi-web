import fs from "node:fs/promises";
import path from "node:path";

import { parse } from "csv-parse/sync";

import { normalizePinyin } from "../app/lib/normalize";

const CSV_PATH = path.join(process.cwd(), "database", "full-HSK.csv");
const OUT_PATH = path.join(process.cwd(), "app", "data", "hanzi-dataset.json");

type RawRow = Record<string, string>;

function pick(row: RawRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function parseLevel(value: string) {
  const raw = value.trim().toLowerCase();

  if (!raw) return null;

  if (raw.includes("beginner")) return 1;
  if (raw.includes("intermediate")) return 2;
  if (raw.includes("advanced")) return 3;

  if (["1", "2", "3"].includes(raw)) return Number(raw);

  const num = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
  if (Number.isFinite(num)) {
    if (num <= 1) return 1;
    if (num === 2) return 2;
    return 3;
  }

  return null;
}

async function main() {
  const rawCsv = await fs.readFile(CSV_PATH, "utf8");

  const rows = parse(rawCsv, {
    columns: true,
    delimiter: ";",
    bom: true,
    skip_empty_lines: true,
    trim: true,
  }) as RawRow[];

  const data = rows
    .map((row) => {
      const sourceId = pick(row, ["ID", "Id", "id"]);
      const levelRaw = pick(row, ["Level", "level", "HSK Level", "HSKLevel", "Group"]);
      const simplified = pick(row, ["Word", "Simplified", "simplified"]);
      const pinyin = pick(row, ["Pinyin", "pinyin"]);
      const normalized = pick(row, ["Normalized", "normalized"]) || normalizePinyin(pinyin);
      const meaning = pick(row, ["Meaning", "Meaning 1", "meaning"]);

      const sentence = pick(row, ["Sentence", "sentence"]);
      const sentencePinyin = pick(row, ["Sentence_Pinyin", "Sentence Pinyin", "sentencePinyin"]);
      const sentenceNormalized =
        pick(row, ["Sentence_Normalized", "Sentence Normalized", "sentenceNormalized"]) ||
        normalizePinyin(sentencePinyin);
      const sentenceMeaning = pick(row, ["Sentence_Meaning", "Sentence Meaning", "sentenceMeaning"]);
      const category = pick(row, ["Category", "category"]);

      const level = parseLevel(levelRaw);

      if (
        !sourceId ||
        !level ||
        !simplified ||
        !pinyin ||
        !meaning ||
        !sentence ||
        !sentencePinyin ||
        !sentenceMeaning ||
        !category
      ) {
        return null;
      }

      return {
        sourceId,
        level,
        simplified,
        pinyin,
        pinyinNormalized: normalized,
        meaning,
        sentence,
        sentencePinyin,
        sentencePinyinNormalized: normalizePinyin(sentencePinyin),
        sentenceNormalized,
        sentenceMeaning,
        category,
      };
    })
    .filter((row) => row !== null);

  if (data.length === 0) {
    throw new Error("Tidak ada row valid yang bisa di-build. Cek kolom CSV kamu.");
  }

  // The dataset is ordered exactly the way the database ordered it: sourceId is a
  // string column, so `ORDER BY source_id ASC` was a lexicographic comparison.
  // Ordering once here lets pagination be a plain slice at request time.
  data.sort((a, b) => (a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0));

  const withIds = data.map((row, index) => ({ id: index + 1, ...row }));

  const seen = new Set<string>();
  for (const row of withIds) {
    if (seen.has(row.sourceId)) {
      throw new Error(`Duplicate sourceId in CSV: ${row.sourceId}`);
    }
    seen.add(row.sourceId);
  }

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, `${JSON.stringify(withIds)}\n`, "utf8");

  const byLevel = withIds.reduce<Record<number, number>>((acc, row) => {
    acc[row.level] = (acc[row.level] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Wrote ${withIds.length} rows to ${path.relative(process.cwd(), OUT_PATH)}`);
  console.log(
    `Levels: ${Object.entries(byLevel)
      .map(([level, count]) => `L${level}=${count}`)
      .join(", ")}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
