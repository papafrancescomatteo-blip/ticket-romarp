# Bot Ticket Server Secondari Roma RP

Bot ticket per Discord + sito con **home pubblica** e **area staff** (`/staff`) per gestire i ticket di tutti i server secondari da un unico posto.

Basato su [Discord Tickets](https://github.com/discord-tickets/bot) di eartharoid (licenza **GPL-3.0**, vedi `LICENSE`). Il bot ha tutte le funzioni originali: `/nuovo`, `/close`, `/forza-chiusura`, `/aggiungi`, `/rimuovi`, `/prendi-in-carica`, `/rilascia`, `/priorita`, `/sposta`, `/rename`, `/topic`, `/tag`, `/tickets`, `/transcritto`, `/transfer`, `/help`.

Cosa è stato cambiato rispetto all'originale:
- nome e footer "Bot Ticket Server Secondari Roma RP", lingua predefinita **italiano**, telemetria disattivata;
- nuove pagine: `/` (home) e `/staff` (area staff) + API `/api/staff/*`;
- area staff accessibile **solo agli ID Discord autorizzati** (whitelist nel database, gestita dal proprietario);
- database **PostgreSQL** (l'originale non supporta MongoDB), deploy pronto per **Render** (`render.yaml`).

## Area staff

- Login con Discord, poi controllo dell'ID: se non è in whitelist vede "Non autorizzato".
- Proprietario: ID in `STAFF_OWNER_ID` (impostato a `1254356172631179297`). Solo lui vede la scheda **Accessi staff** dove aggiunge/rimuove altri ID.
- Per ogni ticket di ogni server: filtri (server, stato, priorità, ricerca per n° ticket o ID utente), modifica priorità e argomento, trascrizione, chiusura forzata.
- Per claim/rilascio, aggiungi/rimuovi membri, sposta, ecc. si usano i comandi nel canale del ticket.

## Deploy su Render (passo per passo)

### 1) Applicazione Discord
1. Vai su https://discord.com/developers/applications → **New Application**.
2. **Bot** → *Reset Token* → copia il token (`DISCORD_TOKEN`). Attiva i 3 *Privileged Gateway Intents*: **Presence**, **Server Members**, **Message Content**.
3. **OAuth2** → copia il **Client Secret** (`DISCORD_SECRET`). Il Redirect lo aggiungi al punto 4.
4. Tieni il bot **privato** (Bot → disattiva "Public Bot").

### 2) Chiave di cifratura (`ENCRYPTION_KEY`, minimo 48 caratteri)
- Windows PowerShell: `[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')`
- Mac/Linux: `openssl rand -hex 32`

**Salvala in un posto sicuro**: se la perdi, i ticket archiviati non si possono più leggere.

### 3) GitHub e Render
1. Crea un repository GitHub (meglio privato) e caricaci il contenuto di questa cartella (non `node_modules`).
2. Su https://dashboard.render.com → **New → Blueprint** → scegli il repository: Render legge `render.yaml` e crea servizio + database PostgreSQL.
3. Compila le variabili richieste: `DISCORD_TOKEN`, `DISCORD_SECRET`, `ENCRYPTION_KEY` e `HTTP_EXTERNAL` (l'URL del servizio, es. `https://bot-ticket-roma-rp.onrender.com`, **senza `/` finale**; se non lo conosci ancora metti un valore provvisorio, poi correggilo e fai *Manual Deploy*).
4. Torna nel Developer Portal → OAuth2 → **Redirects** → aggiungi `https://IL-TUO-URL/auth/callback`.

> Piani: il web service "free" di Render va in standby e il bot risulterebbe offline; il Postgres "free" scade dopo 30 giorni. Per questo il blueprint usa piani a pagamento (`starter` e `basic-256mb`): verifica i prezzi attuali su Render.

### 4) Invitare il bot nei server
Apri `https://IL-TUO-URL/auth/login?invite` e scegli il server. Ripeti per ogni server secondario.

### 5) Configurare ogni server
Apri `https://IL-TUO-URL/settings/ID_DEL_SERVER` (pannello impostazioni originale): crea le **categorie** dei ticket, i **ruoli staff**, il **pannello** con il bottone/menu per aprire i ticket e il canale di log. L'ID del server si copia da Discord con la modalità sviluppatore.

### 6) Area staff
Apri `https://IL-TUO-URL/staff`, accedi con Discord. Dalla scheda **Accessi staff** autorizzi gli altri ID.

## Sempre online e dati che non si resettano

- **Dati permanenti**: ticket, categorie, tag, trascrizioni e impostazioni stanno nel database PostgreSQL di Render (piano `basic-256mb`, a pagamento). Un nuovo deploy o un riavvio del bot **non cancella nulla**.
- **Non cambiare mai `ENCRYPTION_KEY`**: i contenuti dei ticket sono cifrati con quella chiave. Se la modifichi o la perdi, i dati esistenti diventano illeggibili.
- **Bot sempre acceso**: il web service usa il piano `starter`, che non va mai in standby. Con il piano free il bot si spegne dopo un po' di inattività, quindi non usarlo.
- **Riavvii automatici**: Render controlla `/status` e riavvia il servizio se non risponde; all'avvio il bot si ricollega a Discord da solo.
- **Backup**: nella dashboard del database controlla che i backup siano attivi per il tuo piano ed esegui ogni tanto un export manuale.
- Il disco del servizio non è permanente (vale solo per log e file temporanei): per questo tutto ciò che conta è nel database.

## Note
- Il filesystem di Render non è permanente: i dati dei ticket stanno nel database, non su disco.
- Variabili utili: `SUPER` (ID con accesso alle impostazioni di tutti i server), `STAFF_OWNER_ID` (proprietari area staff, separati da virgola).
- Se distribuisci il codice modificato, deve restare sotto GPL-3.0 con i sorgenti disponibili.
