# websocket-gateway

Cloud Run service. WebSocket pe `/ws`, notificari de la event-processor pe `POST /internal/notify`, broadcast pe BigQuery.

## Install

```
npm install
cp .env.sample .env
```

## Test local

```
npm run dev
```

## Deploy

```
gcloud run deploy websocket-gateway \
  --source=. --region=$REGION --project=$PROJECT \
  --allow-unauthenticated --port=8080 \
  --timeout=3600 --session-affinity \
  --set-env-vars="INTERNAL_SHARED_SECRET=$SECRET,BIGQUERY_DATASET=analytics,BIGQUERY_TABLE_VIEWS=movie_views,STATS_WINDOW_MINUTES=10,BIGQUERY_ENABLED=true"
```

IAM:
```
SA=$(gcloud run services describe websocket-gateway --region=$REGION --project=$PROJECT --format='value(spec.template.spec.serviceAccountName)')
gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:$SA" --role="roles/bigquery.dataViewer"
gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:$SA" --role="roles/bigquery.jobUser"
```

## Env vars

`PORT`, `INTERNAL_SHARED_SECRET`, `BIGQUERY_DATASET`, `BIGQUERY_TABLE_VIEWS`, `STATS_WINDOW_MINUTES`, `BIGQUERY_ENABLED`
