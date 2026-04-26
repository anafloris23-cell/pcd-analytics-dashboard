# dashboard

Frontend (HTML + JavaScript vanilla) servit static de `websocket-gateway`. 
Fisierele sursa se afla in `../websocket-gateway/public/`:

- `index.html` — layout (top filme, activitate recenta, badge-uri status).
- `style.css` — styling.
- `app.js` — client WebSocket cu auto-reconnect (exponential backoff 1s -> 30s).

## Acces

```
https://<websocket-gateway-url>/
```

WebSocket endpoint-ul: `/ws` (acelasi host).
