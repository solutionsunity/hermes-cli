# hermes-cli

Self-contained builds of the [Hermes Agent](https://github.com/NousResearch/hermes-agent) CLI for ACP clients,
one per [ACP registry](https://github.com/agentclientprotocol/registry) target, from each Hermes release.
Nothing needs to be installed first: each archive carries its own Python, uv, Node, npm, pnpm, ripgrep and
ffmpeg. git is bundled on Windows; on Linux and macOS Hermes uses the system's git, by its own choice.

**Community build.** Solutions Unity builds and maintains these from each Hermes release, until Nous Research
publishes binaries of its own; then this repo steps aside ([#2](https://github.com/solutionsunity/hermes-cli/issues/2)).

## What a release holds

A release here carries the tag of the Hermes release it is built from (`v0.23.1` is Hermes `v0.23.1`):

- `hermes-cli-<version>-<target>.tar.gz` (`.zip` on Windows) and its `.sha256`, for `linux-x86_64`,
  `linux-aarch64`, `darwin-aarch64`, `darwin-x86_64`, `windows-x86_64` and `windows-aarch64`.
- `binary.json`: the registry entry's `distribution.binary`, with each archive's URL, sha256 and command.
- A build provenance attestation per archive (`gh attestation verify <archive> --repo solutionsunity/hermes-cli`).

Extract an archive and run `bin/hermes-acp` for ACP, or `bin/hermes` for the CLI (`hermes --tui` for its
terminal UI). The web dashboard (`hermes dashboard`) is not included: it is a separate web app, outside a CLI
build.

## How it is built

The build is Hermes' own: `scripts/bundles/native_build.py` prepares, then assembles the payload on a
GitHub-hosted runner of each target, and `scripts/smoke-payload.sh` boots it relocated (network off on Linux).
Three steps are ours:

- [`profile/acp.py`](profile/acp.py) narrows what the payload stages to the ACP profile: the agent core with
  the `acp` and `mcp` extras, the tools listed above, and no offline dependency cache. Each edit is anchored on
  the line it replaces, so a Hermes release that moves one fails the build instead of shipping something else.
- The TUI is built with Hermes' own compiler (`scripts/build/tui.mjs`) on the payload's Node and pnpm, into
  `hermes_cli/tui_dist`, where Hermes' launcher looks for it; Hermes' own lookup must then find it.
- [`check/acp-handshake.mjs`](check/acp-handshake.mjs) launches `hermes-acp` with only the system's own `PATH`,
  the way a registry client does. It requires `initialize` to answer with the release's version and a login
  method, and `session/new` to open a session once a model is chosen (no key is set, nothing reaches a provider).

Every hour, the Release workflow looks for a Hermes release not yet built here and publishes it once every
target passes. A failed build opens one issue for its tag, and the hourly run leaves that tag alone while the
issue is open. Actions › Release › Run workflow builds a tag by hand (its latest release when empty), and
publishes it when asked.

## License

MIT — see [LICENSE](LICENSE). Hermes Agent is MIT, © Nous Research.
