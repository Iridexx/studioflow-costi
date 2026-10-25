# StudioFlow Costi

Programma interno per i costi di sviluppo di StudioFlow: spese, abbonamenti, API di intelligenza
artificiale, server, ore di lavoro e versamenti dei soci.

**Non fa parte di StudioFlow e non va mai distribuito agli studi.** Vive in questo repository
privato; in StudioFlow c'è solo una voce di menu che lo apre, visibile se sul server è impostata
`STUDIOFLOW_COSTI_URL`.

## Cosa c'è

- **Riepilogo**: speso dall'inizio, speso nell'anno, costi fissi al mese, previsione dei
  prossimi 12 mesi, cassa comune, costo per studio pilota, spese per mese e per categoria,
  saldo tra soci, ore di lavoro, abbonamenti attivi.
- **Spese**: una tantum, mensili o annuali (con data di fine quando si disdice), IVA, fornitore,
  categoria, chi l'ha pagata (cassa comune o un socio di tasca sua). Le ricorrenti si inseriscono
  una volta sola: il programma conta da solo ogni addebito mensile o annuale.
- **Approvazione delle spese**: una spesa entra nei conti solo quando l'hanno approvata tutti i
  soci con accesso (chi la inserisce la approva in automatico; con un socio solo è subito nei
  conti). Su ogni spesa i soci possono scriversi per chiedere spiegazioni prima di approvare. Chi
  ha qualcosa da approvare o una domanda a cui rispondere lo vede in alto in ogni pagina.
  Modificare una spesa la rimette in attesa; una spesa già approvata la elimina solo un
  amministratore.
- **Ore**: chi, quando, quante, su cosa; valorizzate con il costo orario del socio nel giorno
  della registrazione (le ore registrate quando il costo era 0 € prendono il primo costo orario
  impostato). L'argomento si sceglie da un menu; uno nuovo scritto lì entra nel menu da solo.
  Come le spese, le ore entrano nei conti quando le hanno confermate tutti i soci: la colonna
  Confermate dice a che punto sono.
- **Soci e versamenti**: quota di ciascuno (la somma fa sempre 100%: quando entra un socio o
  cambia una quota, la differenza si toglie agli altri, da sola se l'altro socio è uno solo,
  altrimenti con una proposta in proporzione che si può correggere), versamenti in cassa comune, saldo (chi ha messo più
  o meno della sua quota).
- **Accordo**: la bozza dell'accordo tra i soci (`docs/accordo-soci.md`) con i dati delle parti
  presi dal programma. Ogni socio inserisce i propri dati (codice fiscale, nascita, residenza),
  l'amministratore sceglie chi è la Parte A e chi la Parte B; i dati mancanti sono evidenziati e
  il testo si stampa o si salva in PDF.
- **Impostazioni**: la propria password, argomenti delle ore (rinominarli aggiorna anche le ore
  già registrate), numero di studi pilota, categorie di spesa, indirizzo
  del programma da mandare ai soci.
- **Riepilogo giornaliero**: nei giorni in cui vengono inserite spese o ore, i soci con un'email
  ricevono un riepilogo (di base alle 23:55, orario in Impostazioni). Se il PC server era spento
  a quell'ora, il riepilogo perso parte alla riaccensione.
- **Esporta in Excel**: tutti i dati in un file, per il commercialista o per archivio.

Ognuno entra con il proprio nome utente e la propria password, diversa da quella di StudioFlow.

## Installazione sul PC server (una volta sola)

Serve lo stesso PC dove gira StudioFlow, con Node.js 22, pnpm e Git già installati. Il database
è lo stesso PostgreSQL di StudioFlow, in un database separato (`studioflow_costi`) che viene
creato da solo.

In PowerShell, un comando alla volta:

```
cd "C:\Users\marco\Programmazione\Visual Studio"
git clone https://github.com/Iridexx/studioflow-costi.git
cd studioflow-costi
copy .env.example .env
```

Se la password del database di StudioFlow è diversa da quella predefinita, correggi
`DATABASE_URL` nel file `.env` come nel `.env` di StudioFlow (cambia solo il nome finale del
database: `studioflow_costi`).

Poi doppio clic su **`aggiorna-costi.bat`**: installa, prepara il database e avvia il programma
sulla porta **3100** (finestra "StudioFlow-Costi" ridotta a icona: se la chiudi il programma si
ferma). Al primo accesso da http://localhost:3100 si crea l'utente amministratore; da
**Soci e versamenti** si aggiunge il socio.

### Aggiungere un socio

Solo un amministratore. In **Soci e versamenti → Aggiungi un socio** scrivi nome, nome utente,
email e una password provvisoria (o premi **Genera**). Il programma spedisce subito al socio
l'email con indirizzo, nome utente e password; al primo accesso il socio deve sceglierne una sua
prima di poter fare altro.

Per spedire serve impostare una volta la tua casella in **Impostazioni → Invio email**: email,
servizio (Gmail, Aruba, Libero o altro) e password. Con Gmail serve una "password per le app"
(da myaccount.google.com/apppasswords, con la verifica in due passaggi attiva). Al salvataggio il
programma ti manda un'email di prova: se non parte, te lo dice e non salva. Finché l'invio non è
impostato, o se non riesce, compare l'email già pronta da spedire con un clic o da copiare.

Perché l'indirizzo nell'email sia giusto, salvalo una volta in **Impostazioni → Indirizzo per i
soci** (es. `http://nome-pc:3100`); se apri il programma da `localhost` te lo ricorda.

### Backup notturno

Nel file `.env` indica in `COSTI_BACKUP_DIR` una cartella sincronizzata (es.
`C:\Users\marco\OneDrive\Backup StudioFlow Costi`), poi doppio clic su **`installa-backup.bat`**:
programma il backup ogni sera alle 23 e ne fa subito uno di prova. Si tengono gli ultimi 30.

Per ripristinare un backup (con il database di Docker):

```
docker cp "percorso\studioflow-costi-AAAAMMGG-HHMMSS.dump" studioflow-postgres-1:/tmp/ripristino.dump
docker exec studioflow-postgres-1 pg_restore -U studioflow -d studioflow_costi --clean /tmp/ripristino.dump
```

### Collegamento dal menu di StudioFlow

Nel file `.env` di **StudioFlow** (non di questo programma) aggiungi:

```
STUDIOFLOW_COSTI_URL="http://localhost:3100"
```

e riavvia StudioFlow con `aggiorna-studioflow.bat -Forza`. Titolare e amministratori vedono la
voce "Costi di sviluppo" in fondo al menu. Se lo usate anche da fuori con Tailscale, metti
l'indirizzo Tailscale del PC al posto di `localhost` (es. `http://nome-pc:3100`), che funziona
sia in ufficio sia fuori.

### Accesso del socio da fuori ufficio

Come StudioFlow: con Tailscale. Il socio installa Tailscale, tu lo inviti nella tua rete (o
condividi solo il PC server dalla console di Tailscale) e lui apre `http://nome-pc:3100`.
Il PC server deve essere acceso.

## Aggiornare

Doppio clic su `aggiorna-costi.bat`: scarica le novità, prepara la nuova versione mentre la
vecchia continua a funzionare, aggiorna il database e riavvia. Se qualcosa va storto riavvia la
versione precedente.

## Password dimenticata

Un amministratore dà una nuova password provvisoria da **Soci e versamenti → Modifica** e
prepara di nuovo l'email; il socio la cambierà al primo accesso. Se nessuno riesce più a entrare,
sul PC server:

```
pnpm reimposta-password <nome utente> <nuova password>
```

## Sviluppo

```
pnpm install
pnpm db:deploy
pnpm dev            # http://localhost:3100
pnpm lint
pnpm typecheck
pnpm test
```

Stack come StudioFlow: Next.js 16, React 19, Prisma 7 + PostgreSQL, Tailwind 4. Importi in
centesimi, ore in minuti. Le spese ricorrenti sono una sola voce che si espande negli addebiti
mensili o annuali (`src/modules/summary/calc.ts`).
