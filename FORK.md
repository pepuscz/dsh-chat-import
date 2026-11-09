# Reviewed migration fork

Upstream baseline: c1c4f627d03d95a60dd8bade12212150ed8af276 (0.26.4).

Quick review, not a full security audit. Local transcript conversion, one runtime
dependency fzstd 0.1.1 (no transitive runtime dependencies), host-provided peers.
No install scripts are executed during our deployment.

Exact panel routes now require DSH connection admission and POST. Unsupported hosts
fail closed. This shares the host browser/token trust boundary, not per-workspace
Gateway authorization; deploy only on a private host with trusted paired clients.

Defaults disable imported system prompts and model tool injection; manual GUI
imports remain available. No bulk migration or source-directory permissions are granted.
The source-delete action exists upstream and moves files to plugin trash on macOS.
Use staged copies when selecting histories.

The upstream Goose test assumed Linux when checking the current platform; its
expectation now accounts for macOS without changing runtime behavior.

Keep upstream remote and merge reviewed releases. Pin deployment by full commit
and archive SHA-256. Never store transcripts, tokens, or machine configuration here.

For the native remote connector, frontendOnly disables all local host behavior;
the client UI appears only when a remote host is selected. The connector admits
and forwards only the explicit /api-import/ route family to that selected host.
