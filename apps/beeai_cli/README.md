> ⚠️ **WIP documentation** ⚠️

# `beeai` CLI

The CLI's primary purpose is to connect to a `beeai-server` and control it.

The secondary purpose is to spawn the `beeai-server` for local use.

## Environment

- `BEEAI_HOST` (default: localhost:8333) -- URL to `beeai-server` used by the CLI

## Interface

Structured as `beeai <subject> <verb>`. Commands should accept both singular and plural `<subject>`, as well as some common verb aliases (`ls`/`list`, `rm`/`remove`/`delete` etc.)

Providers are defined in a config file `$XDG_CONFIG_HOME/beeai-server.yaml`, appropriate commands edit this file + spawn/despawn the processes for local providers.

- `beeai server`
  - `beeai server start`
    - Spawns `beeai-server` (similar to `ollama serve`) to listen on `BEEAI_HOST`
    - In turn, `beeai-server` spawns all non-disabled providers
    - Primarily used by Brew / systemd to spawn the daemon

- `beeai agent-template`
  - `beeai agent-template ls` lists available agent templates

- `beeai agent`
  Agents are listed by the connected providers.
  - `beeai agent run <template-name> <input>` runs the agent with given input params

- `beeai provider`
  - `beeai provider sync` spawns/despawns providers after manually editing `beeai-server.yaml`
  - `beeai provider add [--disabled] <url>`
    Add a given URL to the providers list and spawn the provider if local and not disabled. Blocks until succefully spawned. Gives error when failing to spawn.
    - **Unamanaged providers:**
      - `beeai provider add mcp+<provider-host>`
        - For connecting existing running MCP providers
        - MCP sub-protocol can be any of the supported ones (like `mcp+http`)
          
    - **Managed providers:**
      - `beeai provider add npx:<npm-package-name>`
        - For running an NPM-published Node.js provider
        - Runs `PORT=<port> npx npm-package-name`
      
      - `beeai provider add npx+git+<git-url>#<binary>`
        - For running a Git-published Node.js provider
        - Runs `PORT=<port> npx --package git+<git-url> <binary>`
          
      - `beeai provider add uvx:<pypi-package-name>`
        - For running an PyPI-published Python provider
        - Runs `PORT=<port> uvx <pypi-package-name>`
      
      - `beeai provider add uvx+git+<git-url>#<binary>`
        - For running a Git-published Python provider
        - Runs `PORT=<port> uvx --from git+<git-url> <binary>`
          
      - `beeai provider add docker:<docker-image-specifier>`
        - For running local and published Docker images (docker.io, icr.io etc.)
        - Runs `docker run --env PORT=<port> -p <port>:<port> --rm <docker-image-specifier>`
  - `beeai provider ls [--disabled|--enabled]`
    Lists provider URLs, enabled/disabled.
  - `beeai provider rm <provider>`
  - `beeai provider enable <provider>`
  - `beeai provider disable <provider>`
  - If unique, `<provider>` can be a substring match (e.g. `owner/repo` instead of whole URL)

- `beeai ui`
  - `beeai ui open` -- opens the BeeAI UI in the browser
  - `beeai ui add <url>`
    Unmanaged:
    - `beeai ui add http://<url>`
      - Add any webpage as an agentic UI
      - Must define `<url>/.well-known/beeai-ui.json` to be accepted and added
        - Manifest defines the protocol version
        - # TODO: what else could the manifest define? do we need it?
    Managed:
    - `beeai ui add http://<url>.zip`
      - Download the given ZIPfile, find `beeai-ui.json` inside