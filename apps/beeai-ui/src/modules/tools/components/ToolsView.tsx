import { useListTools } from '../api/queries/useListTools';

export const ToolsView = () => {
  const { data, isLoading, isSuccess } = useListTools();

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
