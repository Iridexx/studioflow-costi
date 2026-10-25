-- CreateTable
CREATE TABLE "TimeTopic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TimeTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeTopic_name_key" ON "TimeTopic"("name");

-- Argomenti iniziali (modificabili da Impostazioni) più quelli già usati nelle ore registrate.
INSERT INTO "TimeTopic" ("id", "name", "position") VALUES
  ('top_sviluppo', 'Sviluppo', 1),
  ('top_test', 'Prove e test', 2),
  ('top_riunione', 'Riunione', 3),
  ('top_studi', 'Assistenza agli studi', 4),
  ('top_documentazione', 'Documentazione', 5),
  ('top_commerciale', 'Commerciale', 6)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "TimeTopic" ("id", "name", "position")
SELECT 'top_' || md5("topic"), "topic", 100 + ROW_NUMBER() OVER (ORDER BY "topic")
FROM (SELECT DISTINCT "topic" FROM "TimeEntry") t
ON CONFLICT ("name") DO NOTHING;
