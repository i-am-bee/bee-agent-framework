import { useMCPClient } from '@/contexts/MCPClient';
import { useQuery } from '@tanstack/react-query';
import { toolKeys } from '../keys';
import { ListToolsParams } from '../types';

interface Props {
  params?: ListToolsParams;
}

export function useListTools({ params }: Props = {}) {
  const client = useMCPClient();

  const query = useQuery({
    queryKey: toolKeys.list(params),
    queryFn: () => client.listTools(params),
  });

  return query;
}
