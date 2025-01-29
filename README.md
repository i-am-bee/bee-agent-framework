```sh
# Clone with submodules
git clone --recurse-submodules https://github.com/i-am-bee/beeai.git
```

```sh
# TODO ultra temporary before I get write acces to the repository

# Modify /packages/mcp-python-sdk/pyproject.toml
rm /packages/mcp-python-sdk/uv.lock
# Remove the following lines from /packages/mcp-python-sdk/pyproject.toml
-[tool.uv.workspace]
-members = ["examples/servers/*"]
-
-[tool.uv.sources]
-mcp = { workspace = true }
```

```sh
# install dependencies
uv sync

# API
uv run beeai-api

# CLI

# add example python tool provider
uv run beeai-cli registry add /path/to/repo/beeai/packages/mcp-python-sdk/examples/servers/simple-tool
uv run beeai-cli registry ls

# Now you need to restart API (!)

# tools
uv run beeai-cli list tools
uv run beeai-cli call fetch "url=http://iambee.ai"
```