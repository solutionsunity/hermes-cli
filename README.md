# hermes-cli

Self-contained builds of the [Hermes Agent](https://github.com/NousResearch/hermes-agent) CLI for ACP clients,
one per [ACP registry](https://github.com/agentclientprotocol/registry) target, from each Hermes release.
Nothing needs to be installed first: each archive carries its own Python, uv, Node, npm, pnpm, ripgrep and
ffmpeg. git is bundled on Windows; on Linux and macOS Hermes uses the system's git, by its own choice.

**Unofficial.** Nous Research does not publish or support these builds. This repo stands in until Hermes ships
binaries of its own, and steps aside when it does.

## What a release holds

A release here carries the tag of the Hermes release it is built from (`v0.23.1` is Hermes `v0.23.1`):

- `hermes-cli-<tag>-<target>.tar.gz` (`.zip` on Windows) and its `.sha256`, for `linux-x86_64`,
  `linux-aarch64`, `darwin-aarch64`, `darwin-x86_64`, `windows-x86_64` and `windows-aarch64`.
- `binary.json`: the registry entry's `distribution.binary`, with each archive's URL, sha256 and command.
- A build provenance attestation per archive (`gh attestation verify <archive> --repo solutionsunity/hermes-cli`).

Extract an archive and run `bin/hermes-acp` for ACP, or `bin/hermes` for the CLI.

## How it is built

The build is Hermes' own: `scripts/bundles/native_build.py` prepares, then assembles the payload on a
GitHub-hosted runner of each target, and `scripts/smoke-payload.sh` boots it relocated (network off on Linux).
Two steps are ours:

- [`profile/acp.py`](profile/acp.py) narrows what the payload stages to the ACP profile: the agent core with
  the `acp` and `mcp` extras, the tools listed above, and no offline dependency cache. Each edit is anchored on
  the line it replaces, so a Hermes release that moves one fails the build instead of shipping something else.
- [`check/acp-handshake.mjs`](check/acp-handshake.mjs) launches `hermes-acp` with only the system's own `PATH`,
  the way a registry client does, and requires it to answer `initialize` with the release's version and a
  login method.

Actions › Release › Run workflow builds a Hermes tag (its latest release when empty) and publishes it when
asked.

## License

MIT — see [LICENSE](LICENSE). Hermes Agent is MIT, © Nous Research.
