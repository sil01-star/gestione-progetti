# Project Compass PWA

Prototipo iniziale mobile-first per project / problem management, progettato per funzionare offline dopo il primo caricamento da un'origine HTTPS.

## Funzionalità incluse
- Portfolio di progetti
- Registro problemi con stakeholder, tipologia, priorità e stato
- Soluzioni collegate ai problemi
- Task collegati alle soluzioni con stati: da iniziare, in corso, concluso
- Analisi per tipologia e suggerimenti da knowledge base locale
- Database IndexedDB
- Service worker e manifest PWA
- Esportazione e ripristino JSON

## Avvio da Android
1. Carica l'intera cartella su un hosting statico HTTPS (ad esempio GitHub Pages).
2. Apri l'indirizzo in Chrome su Android mentre sei online.
3. Attendi il caricamento completo; poi usa il menu Chrome > Aggiungi a schermata Home / Installa app.
4. Apri l'app installata e crea un progetto.
5. Verifica la modalità aereo, chiudi e riapri l'app.

Non usare `file://` per testare una PWA: service worker e installazione richiedono un contesto sicuro (HTTPS o localhost).

## Sviluppo
Per sviluppo locale, usa un server statico (es. `python -m http.server 8000`) e apri `http://localhost:8000` su un browser desktop. Su Android, usa un IDE cloud che pubblichi il progetto su HTTPS.

## Dati e sicurezza
- I dati sono salvati nel profilo browser del dispositivo.
- Esporta backup JSON regolarmente.
- La cancellazione dei dati del sito può cancellare il database.
- Non sono presenti chiamate di rete applicative né chiavi API.
- L'integrazione AI cloud futura dovrà passare da un backend, con consenso esplicito e minimizzazione dei dati. Non inserire mai chiavi segrete nel JavaScript distribuito al browser.

## Limiti del prototipo
- Il campo stakeholder è testo libero, non ancora un'anagrafica relazionale.
- La tassonomia iniziale è ispirata a pratiche PM, non è una certificazione o implementazione ufficiale PMBOK/PRINCE2.
- I suggerimenti sono regole locali curate, non generazione AI.
- Non ci sono ancora gestione multiutente, sincronizzazione, allegati, scadenze, audit log o test automatizzati completi.
