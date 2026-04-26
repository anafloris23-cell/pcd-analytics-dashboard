const path = require('path');
const fastifyFactory = require('fastify');
const websocket = require('@fastify/websocket');
const fastifyStatic = require('@fastify/static');
const { BigQuery } = require('@google-cloud/bigquery');

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = '0.0.0.0';
const INTERNAL_SHARED_SECRET = process.env.INTERNAL_SHARED_SECRET || '';
const BIGQUERY_DATASET = process.env.BIGQUERY_DATASET || 'analytics';
const BIGQUERY_TABLE_VIEWS = process.env.BIGQUERY_TABLE_VIEWS || 'movie_views';
const STATS_WINDOW_MINUTES = parseInt(process.env.STATS_WINDOW_MINUTES || '10', 10);
const BIGQUERY_ENABLED = (process.env.BIGQUERY_ENABLED || 'true').toLowerCase() === 'true';

const fastify = fastifyFactory({ logger: { level: process.env.LOG_LEVEL || 'info' } });
const bigquery = BIGQUERY_ENABLED ? new BigQuery() : null;
const clients = new Set();

fastify.register(websocket);

fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
  decorateReply: false
});

fastify.register(async function (instance) {
  instance.get('/ws', { websocket: true }, async (socket, request) => {
    clients.add(socket);
    instance.log.info(`client connected (total=${clients.size})`);

    try {
      const stats = await fetchTopMovies();
      sendSafe(socket, {
        type: 'snapshot',
        stats,
        connectedClients: clients.size,
        windowMinutes: STATS_WINDOW_MINUTES
      });
    } catch (err) {
      instance.log.error({ err }, 'initial snapshot failed');
      sendSafe(socket, { type: 'error', message: 'snapshot failed' });
    }

    socket.on('close', () => {
      clients.delete(socket);
      instance.log.info(`client disconnected (total=${clients.size})`);
    });

    socket.on('error', (err) => {
      instance.log.warn({ err }, 'websocket error');
    });
  });
});

fastify.post('/internal/notify', async (request, reply) => {
  if (!INTERNAL_SHARED_SECRET || request.headers['x-internal-secret'] !== INTERNAL_SHARED_SECRET) {
    return reply.code(401).send({ error: 'unauthorized' });
  }

  let stats;
  try {
    stats = await fetchTopMovies();
  } catch (err) {
    fastify.log.error({ err }, 'bigquery query failed during notify');
    return reply.code(500).send({ error: 'bigquery error' });
  }

  const payload = JSON.stringify({
    type: 'stats-update',
    stats,
    connectedClients: clients.size,
    windowMinutes: STATS_WINDOW_MINUTES,
    event: request.body || null,
    serverTimestamp: new Date().toISOString()
  });

  let delivered = 0;
  for (const socket of clients) {
    if (socket.readyState === 1) {
      try {
        socket.send(payload);
        delivered++;
      } catch (err) {
        fastify.log.warn({ err }, 'broadcast send failed for one client');
      }
    }
  }

  return reply.code(200).send({ delivered });
});

fastify.get('/health', async () => ({
  status: 'ok',
  connectedClients: clients.size,
  bigqueryEnabled: BIGQUERY_ENABLED
}));

async function fetchTopMovies() {
  if (!bigquery) {
    return [];
  }
  const query = `
    SELECT resource_id, COUNT(*) AS views
    FROM \`${BIGQUERY_DATASET}.${BIGQUERY_TABLE_VIEWS}\`
    WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @windowMinutes MINUTE)
      AND resource_type = 'movie'
    GROUP BY resource_id
    ORDER BY views DESC
    LIMIT 10
  `;
  const [rows] = await bigquery.query({
    query,
    params: { windowMinutes: STATS_WINDOW_MINUTES }
  });
  return rows.map((row) => ({
    resourceId: row.resource_id,
    views: Number(row.views)
  }));
}

function sendSafe(socket, message) {
  if (socket.readyState !== 1) return;
  try {
    socket.send(JSON.stringify(message));
  } catch (err) {
    fastify.log.warn({ err }, 'send failed');
  }
}

fastify.listen({ port: PORT, host: HOST }).catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});
