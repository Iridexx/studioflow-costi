## Regole del progetto StudioFlow Costi

- Programma interno dei soci per i costi di sviluppo di StudioFlow: non deve mai finire nel
  repository di StudioFlow né essere distribuito agli studi.
- Lingua: interfaccia, documentazione e commenti in italiano; codice e nomi in inglese.
- Next.js 16: leggere la guida in `node_modules/next/dist/docs/` prima di scrivere codice.
- Accesso ai dati solo dai service in `src/modules/*`; ogni pagina e azione chiama
  `requirePartner()` (o `requireAdmin()`).
- Mai dati reali, chiavi o password nel repository.
- Prima di dichiarare finita una modifica: `pnpm lint && pnpm typecheck && pnpm test`.
