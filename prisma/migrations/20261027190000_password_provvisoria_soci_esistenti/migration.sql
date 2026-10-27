-- Prima della password provvisoria (25/10/2026) la password data dall'amministratore a un socio
-- era subito definitiva, e quei soci non sono mai stati obbligati a cambiarla. Ora la devono
-- cambiare al prossimo accesso tutti quelli con una password, tranne il primo socio (chi ha
-- creato il programma col primo accesso e ha scelto la sua). Le loro sessioni aperte restano,
-- ma ogni pagina li porta al cambio password.
UPDATE "Partner"
SET "mustChangePassword" = true
WHERE "passwordHash" IS NOT NULL
  AND "mustChangePassword" = false
  AND "id" <> (
    SELECT "id" FROM "Partner"
    WHERE "passwordHash" IS NOT NULL AND "isAdmin" = true
    ORDER BY "createdAt" ASC, "id" ASC
    LIMIT 1
  );
