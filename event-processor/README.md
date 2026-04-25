# event-processor

Cloud Function (FaaS) — trigger pe Pub/Sub `resource-events`, scrie in BigQuery, notifica WSG prin HTTP.

## Install

```
npm install
cp .env.sample .env
```

## Test local

```
npm run test:local
```

## Deploy

```
gcloud pubsub topics create resource-events --project=$PROJECT
bq mk --location=EU --dataset $PROJECT:analytics
bq query --use_legacy_sql=false --project_id=$PROJECT < sql/schema.sql

gcloud functions deploy event-processor \
  --gen2 --runtime=nodejs22 --region=$REGION \
  --source=. --entry-point=processResourceEvent \
  --trigger-topic=resource-events \
  --set-env-vars="BIGQUERY_DATASET=analytics,BIGQUERY_TABLE_VIEWS=movie_views,BIGQUERY_TABLE_PROCESSED=processed_events,WSG_NOTIFY_URL=$WSG_URL,INTERNAL_SHARED_SECRET=$SECRET" \
  --project=$PROJECT
```

## Env vars

`BIGQUERY_DATASET`, `BIGQUERY_TABLE_VIEWS`, `BIGQUERY_TABLE_PROCESSED`, `WSG_NOTIFY_URL`, `INTERNAL_SHARED_SECRET`
