import { ListAgentsParams } from './types';

export const agentKeys = {
  all: () => ['agents'] as const,
  lists: () => [...agentKeys.all(), 'list'] as const,
  list: (params?: ListAgentsParams) => [...agentKeys.lists(), params] as const,
};
