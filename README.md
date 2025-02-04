```sh
# Clone with submodules
git clone --recurse-submodules git@github.com:i-am-bee/beeai.git
```

## Server

```sh
# install dependencies
uv sync

# API
uv run beeai-server

# CLI

# add example python tool provider
uv run beeai provider add /path/to/repo/beeai/packages/mcp-python-sdk/examples/servers/simple-tool
uv run beeai provider ls

# tools
uv run beeai list tools
uv run beeai call fetch "url=http://iambee.ai"
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
