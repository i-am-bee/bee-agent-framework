```sh
# Clone with submodules
git clone --recurse-submodules git@github.com:i-am-bee/beeai.git
```

```sh
# install dependencies
uv sync

# API
uv run beeai-server

# CLI

# add example python tool provider
uv run beeai-cli provider add /path/to/repo/beeai/packages/mcp-python-sdk/examples/servers/simple-tool
uv run beeai-cli provider ls

# tools
uv run beeai-cli list tools
uv run beeai-cli call fetch "url=http://iambee.ai"
```