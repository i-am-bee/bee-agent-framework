```sh
# Clone with submodules
git clone --recurse-submodules git@github.com:i-am-bee/beeai.git
```

## Server

```sh
# install dependencies
uv sync

# remove existing providers (due to breaking changes during rapid development)
rm -f ~/.beeai/providers.yaml

# API
uv run beeai-server

# CLI

# run example SSE provider
OPENAI_API_KEY=<your-openai-api-key> uv run mcp-simple-agent --transport sse --port 9999

# add SSE provider
uv run beeai provider add mcp http://localhost:9999/sse
# add local filesystem provider
uv run beeai provider add uvx file://packages/mcp-python-sdk/examples/servers/simple-tool
uv run beeai provider list

# tools
uv run beeai tool list
uv run beeai tool call fetch '{"url": "http://iambee.ai"}'

# agents
uv run beeai agent list
uv run beeai agent run website_summarizer "summarize iambee.ai"
```

## UI

```sh
# use correct node version
nvm use

# install pnpm if not available
npm install -g pnpm

# install dependencies
pnpm install

# Run dev server
pnpm --filter=@beeai/ui dev

```
