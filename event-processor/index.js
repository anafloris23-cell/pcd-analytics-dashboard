const functions = require('@google-cloud/functions-framework');
const { BigQuery } = require('@google-cloud/bigquery');

const bigquery = new BigQuery();

const DATASET = process.env.BIGQUERY_DATASET || 'analytics';
const TABLE_VIEWS = process.env.BIGQUERY_TABLE_VIEWS || 'movie_views';
const TABLE_PROCESSED = process.env.BIGQUERY_TABLE_PROCESSED || 'processed_events';
const WSG_NOTIFY_URL = process.env.WSG_NOTIFY_URL || '';
const INTERNAL_SHARED_SECRET = process.env.INTERNAL_SHARED_SECRET || '';

functions.cloudEvent('processResourceEvent', async (cloudEvent) => {
  const message = cloudEvent.data && cloudEvent.data.message;
  if (!message || !message.data) {
    console.warn('Pub/Sub message missing data, skipping');
    return;
  }

  const decoded = Buffer.from(message.data, 'base64').toString('utf8');
  let event;
  try {
    event = JSON.parse(decoded);
  } catch (err) {
    console.error('Failed to parse event JSON, dropping message', { decoded, err: err.message });
    return;
  }

  const { eventId, resourceType, resourceId, action, timestamp } = event;
  if (!eventId || !resourceType || !resourceId || !action || !timestamp) {
    console.error('Event is missing required fields, dropping', { event });
    return;
  }

  const alreadyProcessed = await isAlreadyProcessed(eventId);
  if (alreadyProcessed) {
    console.log(`Event ${eventId} already processed, skipping (at-least-once dedup)`);
    return;
  }

  await insertView({ eventId, resourceType, resourceId, action, timestamp });
  await markProcessed(eventId);

  console.log(`Stored event ${eventId} for ${resourceType}/${resourceId}`);

  await notifyGateway({ eventId, resourceType, resourceId, action, timestamp });
});

async function isAlreadyProcessed(eventId) {
  const [rows] = await bigquery.query({
    query: `SELECT 1 FROM \`${DATASET}.${TABLE_PROCESSED}\` WHERE event_id = @eventId LIMIT 1`,
    params: { eventId }
  });
  return rows.length > 0;
}

async function insertView({ eventId, resourceType, resourceId, action, timestamp }) {
  const row = {
    event_id: eventId,
    resource_type: resourceType,
    resource_id: resourceId,
    action,
    event_timestamp: timestamp,
    ingested_at: new Date().toISOString()
  };
  await bigquery
    .dataset(DATASET)
    .table(TABLE_VIEWS)
    .insert([row], { insertId: eventId });
}

async function markProcessed(eventId) {
  const row = {
    event_id: eventId,
    processed_at: new Date().toISOString()
  };
  await bigquery
    .dataset(DATASET)
    .table(TABLE_PROCESSED)
    .insert([row], { insertId: eventId });
}

async function notifyGateway(event) {
  if (!WSG_NOTIFY_URL) {
    console.warn('WSG_NOTIFY_URL not configured, skipping notify');
    return;
  }
  try {
    const res = await fetch(WSG_NOTIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SHARED_SECRET
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) {
      console.error(`Gateway notify returned ${res.status}`);
    }
  } catch (err) {
    console.error('Gateway notify failed (non-fatal)', err.message);
  }
}
