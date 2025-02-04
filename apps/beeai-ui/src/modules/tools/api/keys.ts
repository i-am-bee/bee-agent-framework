import { ListToolsParams } from './types';

export const toolKeys = {
  all: () => ['tools'] as const,
  lists: () => [...toolKeys.all(), 'list'] as const,
  list: (params: ListToolsParams) => [...toolKeys.lists(), params] as const,
};
