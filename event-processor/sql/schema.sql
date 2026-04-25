-- BigQuery schema for the analytics pipeline.
-- Run once after creating the `analytics` dataset:
--   bq mk --location=EU --dataset $PROJECT:analytics
--   bq query --use_legacy_sql=false < sql/schema.sql

CREATE TABLE IF NOT EXISTS `analytics.movie_views` (
  event_id STRING NOT NULL,
  resource_type STRING NOT NULL,
  resource_id STRING NOT NULL,
  action STRING NOT NULL,
  event_timestamp TIMESTAMP NOT NULL,
  ingested_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(event_timestamp)
CLUSTER BY resource_type, resource_id;

CREATE TABLE IF NOT EXISTS `analytics.processed_events` (
  event_id STRING NOT NULL,
  processed_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(processed_at)
OPTIONS (
  partition_expiration_days = 7
);
