"""Narrows Hermes' native payload to the ACP profile, in a hermes-agent checkout.

The profile is what `hermes acp` needs: the agent core with the acp and mcp
extras, the tools its agent work runs (Python, uv, Node, npm, ripgrep, git,
ffmpeg), and no offline uv cache. Each edit is anchored on the line it
replaces and must match exactly once, so a Hermes release that moves one of
them fails the build here instead of shipping a different payload.

Usage: python profile/acp.py <hermes-agent checkout>
"""
from __future__ import annotations

import sys
from pathlib import Path

EXTRAS = ("acp", "mcp")
TOOLS = ("python", "uv", "node", "npm", "ripgrep", "git", "ffmpeg")

EDITS = (
    # The tool selection keeps only the profile's tools.
    (
        "        if get_package(n).missing_reason(current_target()) is None\n    ]\n",
        "        if get_package(n).missing_reason(current_target()) is None\n"
        f"        and n in {TOOLS!r}\n    ]\n",
    ),
    # The venv installs the profile's extras, not all of them.
    (
        "env=env, cache=cache, all_extras=True, sealed=True, explicit=True,",
        f"env=env, cache=cache, extras={EXTRAS!r}, sealed=True, explicit=True,",
    ),
    (
        '    print("✓ venv (all extras, on the staged interpreter)")',
        f'    print("✓ venv (extras {", ".join(EXTRAS)}, on the staged interpreter)")',
    ),
    # The payload ships an empty uv cache: no offline rebuilds.
    (
        "    src_cache = cache\n"
        "    if src_cache.is_dir():\n"
        "        print(f\"  uv-cache: copying {src_cache} → payload...\", flush=True)\n"
        "        stage_uv_cache(src_cache, payload_cache)\n"
        "        pruned = prune_uv_cache_to_lock(payload_cache, repo_dir)\n"
        "        print(f\"✓ uv-cache (lock-scoped: pruned {pruned} stale entries; offline rebuilds resolve from shipped wheels)\", flush=True)\n"
        "    else:\n"
        "        raise InstallError(\"uv-cache\", \"runtime dependency cache is missing\")\n",
        "    payload_cache.mkdir()\n"
        "    print(\"✓ uv-cache (empty: the ACP profile does no offline rebuilds)\", flush=True)\n",
    ),
)


def main(checkout: Path) -> None:
    native = checkout / "scripts/bundles/native.py"
    text = native.read_text(encoding="utf-8")
    for old, new in EDITS:
        found = text.count(old)
        if found != 1:
            sys.exit(f"profile: expected one match in {native.name}, found {found}:\n{old}")
        text = text.replace(old, new)
    native.write_text(text, encoding="utf-8")
    print(f"profile: ACP (extras {', '.join(EXTRAS)}; tools {', '.join(TOOLS)})")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
