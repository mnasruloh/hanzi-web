import { normalizePinyin } from "@/app/lib/normalize";
import { hanziRows, sentenceCategories, type HanziRow } from "@/app/lib/hanzi-data";

export type LevelFilter = "all" | "beginner" | "intermediate" | "advanced";

export type HanziEntryItem = {
  id: number;
  sourceId: string;
  level: number;
  simplified: string;
  pinyin: string;
  pinyinNormalized: string;
  meaning: string;
};

export type SentenceEntryItem = {
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

export type SearchResult<TItem> = {
  items: TItem[];
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

type WordSearchArgs = {
  query: string;
  page: number;
  pageSize: number;
  level?: LevelFilter;
};

type SentenceSearchArgs = {
  query: string;
  page: number;
  pageSize: number;
  category?: string;
};

function levelToNumber(level: LevelFilter) {
  if (level === "beginner") return 1;
  if (level === "intermediate") return 2;
  if (level === "advanced") return 3;
  return null;
}

function scoreWordItem(item: HanziEntryItem, q: string, qNorm: string) {
  const simplified = item.simplified.toLowerCase();
  const pinyin = item.pinyin.toLowerCase();
  const pinyinNorm = item.pinyinNormalized.toLowerCase();
  const meaning = item.meaning.toLowerCase();
  const qLower = q.toLowerCase();

  if (simplified === qLower) return 0;
  if (pinyinNorm === qNorm) return 1;
  if (simplified.startsWith(qLower)) return 2;
  if (pinyinNorm.startsWith(qNorm)) return 3;
  if (simplified.includes(qLower)) return 4;
  if (pinyin.includes(qLower)) return 5;
  if (pinyinNorm.includes(qNorm)) return 6;
  if (meaning.includes(qLower)) return 7;

  return 99;
}

function scoreSentenceItem(item: SentenceEntryItem, q: string, qNorm: string) {
  const simplified = item.simplified.toLowerCase();
  const pinyin = item.pinyin.toLowerCase();
  const pinyinNorm = item.pinyinNormalized.toLowerCase();
  const sentence = item.sentence.toLowerCase();
  const sentencePinyin = item.sentencePinyin.toLowerCase();
  const sentencePinyinNorm = item.sentencePinyinNormalized.toLowerCase();
  const sentenceNormalized = item.sentenceNormalized.toLowerCase();
  const meaning = item.meaning.toLowerCase();
  const sentenceMeaning = item.sentenceMeaning.toLowerCase();
  const category = item.category.toLowerCase();
  const qLower = q.toLowerCase();

  if (sentence === qLower) return 0;
  if (sentencePinyinNorm === qNorm) return 1;
  if (sentence.startsWith(qLower)) return 2;
  if (sentencePinyinNorm.startsWith(qNorm)) return 3;
  if (simplified === qLower) return 4;
  if (pinyinNorm === qNorm) return 5;
  if (sentence.includes(qLower)) return 6;
  if (sentencePinyin.includes(qLower)) return 7;
  if (sentenceNormalized.includes(qLower)) return 8;
  if (sentencePinyinNorm.includes(qNorm)) return 9;
  if (sentenceMeaning.includes(qLower)) return 10;
  if (meaning.includes(qLower)) return 11;
  if (category.includes(qLower)) return 12;

  return 99;
}

// The database compared `contains` with SQL LIKE, which folds ASCII case for us.
// Doing it explicitly keeps every query that worked before working still.
function contains(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function matchesWord(row: HanziRow, q: string, qNorm: string) {
  return (
    contains(row.simplified, q) ||
    contains(row.pinyin, q) ||
    contains(row.pinyinNormalized, qNorm) ||
    contains(row.meaning, q)
  );
}

function matchesSentence(row: HanziRow, q: string, qNorm: string) {
  return (
    contains(row.simplified, q) ||
    contains(row.pinyin, q) ||
    contains(row.pinyinNormalized, qNorm) ||
    contains(row.meaning, q) ||
    contains(row.sentence, q) ||
    contains(row.sentencePinyin, q) ||
    contains(row.sentencePinyinNormalized, qNorm) ||
    contains(row.sentenceNormalized, q) ||
    contains(row.sentenceMeaning, q) ||
    contains(row.category, q)
  );
}

function toWordItem(row: HanziRow): HanziEntryItem {
  return {
    id: row.id,
    sourceId: row.sourceId,
    level: row.level,
    simplified: row.simplified,
    pinyin: row.pinyin,
    pinyinNormalized: row.pinyinNormalized,
    meaning: row.meaning,
  };
}

function toSentenceItem(row: HanziRow): SentenceEntryItem {
  return { ...row };
}

function buildPage<TItem>(rows: TItem[], safePage: number, take: number): SearchResult<TItem> {
  return {
    items: rows.slice((safePage - 1) * take, (safePage - 1) * take + take),
    total: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / take)),
    currentPage: safePage,
    pageSize: take,
  };
}

export async function searchEntries({
  query,
  page,
  pageSize,
  level = "all",
}: WordSearchArgs): Promise<SearchResult<HanziEntryItem>> {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const take = pageSize;
  const q = query.trim();
  const levelNumber = levelToNumber(level);

  const scoped =
    levelNumber === null ? hanziRows : hanziRows.filter((row) => row.level === levelNumber);

  if (!q) {
    // Dataset order is already sourceId ascending, so this is the old
    // findMany + count pair reduced to one pass and a slice.
    return buildPage(scoped.map(toWordItem), safePage, take);
  }

  const qNorm = normalizePinyin(q);

  const matched = scoped
    .filter((row) => matchesWord(row, q, qNorm))
    .sort(
      (a, b) =>
        scoreWordItem(a, q, qNorm) - scoreWordItem(b, q, qNorm) ||
        a.sourceId.localeCompare(b.sourceId),
    );

  return buildPage(matched.map(toWordItem), safePage, take);
}

export async function getSentenceCategories(): Promise<string[]> {
  return sentenceCategories;
}

export async function searchSentences({
  query,
  page,
  pageSize,
  category = "all",
}: SentenceSearchArgs): Promise<SearchResult<SentenceEntryItem>> {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const take = pageSize;
  const q = query.trim();

  const scoped =
    category === "all" ? hanziRows : hanziRows.filter((row) => row.category === category);

  if (!q) {
    return buildPage(scoped.map(toSentenceItem), safePage, take);
  }

  const qNorm = normalizePinyin(q);

  const matched = scoped
    .filter((row) => matchesSentence(row, q, qNorm))
    .sort(
      (a, b) =>
        scoreSentenceItem(a, q, qNorm) - scoreSentenceItem(b, q, qNorm) ||
        a.sourceId.localeCompare(b.sourceId),
    );

  return buildPage(matched.map(toSentenceItem), safePage, take);
}
