import { PubSub, type Topic } from '@google-cloud/pubsub';
import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

export interface ResourceEventPayload {
  resourceType: string;
  resourceId: string;
  action: string;
}

interface PublishedEvent extends ResourceEventPayload {
  eventId: string;
  timestamp: string;
}

const pubsubPlugin = fp(
  async (fastify: FastifyInstance) => {
    const { PUBSUB_ENABLED, GCP_PROJECT_ID, PUBSUB_TOPIC_RESOURCE_EVENTS } = fastify.config;

    if (!PUBSUB_ENABLED) {
      fastify.log.info('Pub/Sub publishing is disabled (PUBSUB_ENABLED=false)');
      fastify.decorate('publishResourceEvent', async () => {
        /* no-op when Pub/Sub is disabled */
      });
      return;
    }

    if (!GCP_PROJECT_ID) {
      throw new Error('PUBSUB_ENABLED=true but GCP_PROJECT_ID is empty');
    }

    const client = new PubSub({ projectId: GCP_PROJECT_ID });
    const topic: Topic = client.topic(PUBSUB_TOPIC_RESOURCE_EVENTS);

    fastify.log.info(
      `Pub/Sub publisher ready: project=${GCP_PROJECT_ID} topic=${PUBSUB_TOPIC_RESOURCE_EVENTS}`
    );

    fastify.decorate('publishResourceEvent', async (payload: ResourceEventPayload) => {
      const event: PublishedEvent = {
        ...payload,
        eventId: randomUUID(),
        timestamp: new Date().toISOString()
      };
      try {
        const messageId = await topic.publishMessage({ json: event });
        fastify.log.debug({ messageId, event }, 'Published resource event');
      } catch (err) {
        fastify.log.error({ err, event }, 'Failed to publish resource event');
      }
    });

    fastify.addHook('onClose', async () => {
      await client.close();
    });
  },
  { name: 'pubsub-publisher', dependencies: ['server-config'] }
);

export default pubsubPlugin;
