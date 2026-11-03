-- CreateTable
CREATE TABLE "hanzi_entries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "simplified" TEXT NOT NULL,
    "pinyin" TEXT NOT NULL,
    "pinyin_normalized" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "sentence" TEXT NOT NULL,
    "sentence_pinyin" TEXT NOT NULL,
    "sentence_pinyin_normalized" TEXT NOT NULL,
    "sentence_normalized" TEXT NOT NULL,
    "sentence_meaning" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "hanzi_entries_source_id_key" ON "hanzi_entries"("source_id");

-- CreateIndex
CREATE INDEX "hanzi_entries_simplified_idx" ON "hanzi_entries"("simplified");

-- CreateIndex
CREATE INDEX "hanzi_entries_pinyin_normalized_idx" ON "hanzi_entries"("pinyin_normalized");

-- CreateIndex
CREATE INDEX "hanzi_entries_level_idx" ON "hanzi_entries"("level");

-- CreateIndex
CREATE INDEX "hanzi_entries_category_idx" ON "hanzi_entries"("category");
