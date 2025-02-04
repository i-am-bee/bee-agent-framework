import { useQuery } from "react-query";
import { useMCPClient } from "./mcp-client";

export const ToolsView = () => {
  const client = useMCPClient();
  const { data, isLoading, isSuccess } = useQuery({
    queryFn: () => client.listTools(),
  });

  if (isLoading || !data || !isSuccess) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <h2>Available Tools</h2>
      <ul>
        {data.tools.map((tool) => (
          <li key={tool.name}>
            {tool.name} - {tool.description}
          </li>
        ))}
      </ul>
    </>
  );
};
