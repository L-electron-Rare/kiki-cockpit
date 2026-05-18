import type { components } from '@cockpit/shared';
import { createServerFn } from '@tanstack/react-start';
import { serverApi } from './server-api';

type ModelCard = components['schemas']['ModelCard'];
type StatusReport = components['schemas']['StatusReport'];

export const getModels = createServerFn({ method: 'GET' }).handler(
  async () => serverApi.get<ModelCard[]>('/api/public/models'),
);

export const getStatus = createServerFn({ method: 'GET' }).handler(
  async () => serverApi.get<StatusReport>('/api/public/status'),
);
