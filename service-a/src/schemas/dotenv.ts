import { type Static, Type } from '@sinclair/typebox';
import { CONFIG_DEFAULTS } from '../utils/constants/constants';

const EnvSchema = Type.Object({
  NODE_ENV: Type.String({ default: CONFIG_DEFAULTS.ENV }),
  APP_PORT: Type.Number({ default: CONFIG_DEFAULTS.PORT }),
  MONGO_URL: Type.String({ default: CONFIG_DEFAULTS.MONGO_URL }),
  MONGO_DB_NAME: Type.String({ default: CONFIG_DEFAULTS.MONGO_DB_NAME }),
  GCP_PROJECT_ID: Type.String({ default: CONFIG_DEFAULTS.GCP_PROJECT_ID }),
  PUBSUB_TOPIC_RESOURCE_EVENTS: Type.String({
    default: CONFIG_DEFAULTS.PUBSUB_TOPIC_RESOURCE_EVENTS
  }),
  PUBSUB_ENABLED: Type.Boolean({ default: CONFIG_DEFAULTS.PUBSUB_ENABLED })
});

type EnvSchemaType = Static<typeof EnvSchema>;

export { EnvSchema, type EnvSchemaType };
