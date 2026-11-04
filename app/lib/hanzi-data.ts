import "server-only";

import rawDataset from "@/app/data/hanzi-dataset.json";

export type HanziRow = {
  id: number;
  sourceId: string;
  level: number;
  simplified: string;
  pinyin: string;
  pinyinNormalized: string;
  meaning: string;
  sentence: string;
  sentencePinyin: string;
  sentencePinyinNormalized: string;
  sentenceNormalized: string;
  sentenceMeaning: string;
  category: string;
};

// The dataset is ordered by sourceId at build time (see scripts/build-dataset.ts),
// which mirrors the old `ORDER BY source_id ASC`, so callers can paginate with a
// plain slice and never re-sort for the browse path.
export const hanziRows = rawDataset as HanziRow[];

// Equivalent of the old `SELECT DISTINCT category ... ORDER BY category ASC`.
// Computed once per module instance instead of per request.
export const sentenceCategories: string[] = Array.from(
  new Set(hanziRows.map((row) => row.category)),
)
  .filter(Boolean)
  .sort();
