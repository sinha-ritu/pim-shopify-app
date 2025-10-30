
import { createClient } from '@craftzing/akeneo-api';

const akeneoClient = createClient({
  url: process.env.AKENEO_BASE_URL!,
  clientId: process.env.AKENEO_CLIENT_ID!,
  secret: process.env.AKENEO_CLIENT_SECRET!,
  username: process.env.AKENEO_USERNAME!,
  password: process.env.AKENEO_PASSWORD!
});

export { akeneoClient }
