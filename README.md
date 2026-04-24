# PCD Analytics Dashboard

Dashboard de analytics în timp real pentru un API REST de filme. Proiect pentru cursul **Programare în Cloud Distribuit** (PCD) — Proiect 1.

## Cum funcționează

Când un utilizator accesează un film prin `GET /movies/:id`, Service A răspunde imediat și publică un eveniment pe Pub/Sub. O Cloud Function procesează evenimentul asincron, îl scrie în BigQuery și notifică un WebSocket Gateway. Gateway-ul propagă update-ul către toate browserele conectate, care își actualizează dashboard-ul instant — fără refresh, fără polling.

## Arhitectură

```
  ┌──────────┐   HTTP     ┌────────────────┐   Pub/Sub       ┌──────────────────┐
  │  Client  │ ─────────▶ │   Service A    │ ──────────────▶ │  Event Processor │
  │   Web    │            │ (Fast Lazy Bee)│  resource-events│     (FaaS)       │
  └──────────┘            │   Cloud Run    │                 └────────┬─────────┘
                          │       +        │                          │
                          │    MongoDB     │                   write  │  notify
                          └────────────────┘                          ▼
                                                              ┌──────────────┐
                                                              │   BigQuery   │
                                                              └──────┬───────┘
                                                                     │ query
                                                                     ▼
  ┌──────────┐  WebSocket  ┌────────────────────┐
  │Dashboard │◀────────────│ WebSocket Gateway  │
  │ (HTML/JS)│             │    (Cloud Run)     │
  └──────────┘             └────────────────────┘
```

## Componente

- [`service-a/`](service-a/) — REST API de filme (Fastify + TypeScript + MongoDB), extins cu publicare de evenimente.
- [`event-processor/`](event-processor/) — Cloud Function triggerată de Pub/Sub. Scrie în BigQuery cu idempotență.
- [`websocket-gateway/`](websocket-gateway/) — Serviciu cu conexiuni WebSocket persistente. Broadcast către clienți.
- [`dashboard/`](dashboard/) — Pagină web (HTML + JS vanilla) cu reconectare automată.
- [`load-tests/`](load-tests/) — Teste de încărcare cu `autocannon`.
- [`docs/`](docs/) — Raport științific.

## Rulare

Fiecare componentă are README propriu. Quick start pentru Service A:

```bash
cd service-a
npm ci
npm run dev
```

## Licență

[MIT](LICENSE).
