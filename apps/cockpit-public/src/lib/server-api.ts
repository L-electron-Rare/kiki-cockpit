import { createApiClient } from '@cockpit/shared';

// Server-side base URL: in Docker the api service is reachable by name.
// Locally it is the dev API on 127.0.0.1:9100.
const SERVER_API_BASE =
  process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:9100';

export const serverApi = createApiClient({ baseUrl: SERVER_API_BASE });
