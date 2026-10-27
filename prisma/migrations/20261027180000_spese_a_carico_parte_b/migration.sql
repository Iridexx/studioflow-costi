-- Accordo, art. 4.5 e 4.6: le spese sono a carico della Parte B, il piano per lo sviluppo
-- (Claude di Anthropic) 70% Parte B e 30% Parte A. Le spese già registrate senza ripartizione
-- la prendono da sole, con la stessa regola usata per le spese nuove (src/modules/expenses/split.ts).
UPDATE "Expense"
SET "partyBShareBasisPoints" = CASE
  WHEN ("description" || ' ' || COALESCE("supplier", '')) ~* '(\mclaude\M|anthropic)' THEN 7000
  ELSE 10000
END
WHERE "partyBShareBasisPoints" IS NULL;
