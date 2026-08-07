# SmartPrescription Codebase MCP

A **project-specific MCP server** that maps the SmartPrescription Electron application so AI assistants can find relevant code quickly without scanning the entire codebase.

## What it indexes

This MCP understands the **actual architecture** of SmartPrescription:

| Layer | Location | Communication |
|-------|----------|---------------|
| **Frontend** | `DesktopApp/sm/views/`, `sections/`, `scripts/` | jQuery fragment loading |
| **IPC bridge** | `DesktopApp/sm/preload.js` | `window.electronAPI.*` |
| **Backend** | `DesktopApp/sm/handlers/*.js` | `ipcMain.handle` |
| **Database** | `DesktopApp/sm/preData.db` | Raw SQLite via `sqlite3` |
| **Patient data** | Browser `localStorage` | Not in SQLite |

There is **no REST API** and **no C# backend** in this project.

## Tools exposed

| Tool | Purpose |
|------|---------|
| `get_project_overview` | Architecture summary and entry points |
| `get_project_structure` | Files grouped by role (optional layer filter) |
| `list_features` | All feature domains (medicine, diagnosis, etc.) |
| `get_feature_map` | UI → IPC → handler → DB map for one feature |
| `analyze_feature` | Natural-language scoping for a change request |
| `trace_data_flow` | End-to-end data flow for a feature |
| `search_symbols` | Find JS functions/symbols |
| `search_ipc` | Find IPC channels and callers |
| `search_database` | Find SQLite tables and handlers |
| `find_references` | References to file/channel/table/key |
| `get_change_impact` | Impact analysis for a change target |
| `get_file_snippet` | Targeted file excerpt (token-efficient) |
| `reindex` | Force rebuild of local index cache |

## Setup

### 1. Install and build

```bash
cd tools/smartprescription-mcp
npm install
npm run build
```

### 2. Cursor MCP configuration

The project includes `.cursor/mcp.json` at the repo root. After building, restart Cursor or reload MCP servers.

Manual configuration (if needed):

```json
{
  "mcpServers": {
    "smartprescription-codebase": {
      "command": "node",
      "args": ["tools/smartprescription-mcp/dist/index.js"],
      "env": {
        "SMARTPRESCRIPTION_ROOT": "F:/Project/SmartPrescription"
      }
    }
  }
}
```

Adjust `SMARTPRESCRIPTION_ROOT` to your local clone path.

### 3. Verify

```bash
cd tools/smartprescription-mcp
npm run reindex
```

You should see output like: `Index rebuilt at ... (.cache/index.json) (N files)`.

## Usage workflow (for AI)

Recommended flow when making a change:

1. **`get_project_overview`** — understand layers and entry points
2. **`analyze_feature`** — e.g. `"add pagination to medicine list"`
3. **`trace_data_flow`** — confirm UI → IPC → handler → DB path
4. **`get_file_snippet`** — read only relevant code sections
5. **`get_change_impact`** — check related files before editing

## Performance / token efficiency

- **Local index cache** at `tools/smartprescription-mcp/.cache/index.json`
- **Incremental updates** — only re-parses files whose modification time changed
- **Vendor folders excluded** — `libraries/`, `otherlibraries/`, `node_modules/`
- **Large file cap** — `common.js` (~930KB) is never returned whole; use `get_file_snippet`
- **Summaries first** — tools return maps, metadata, and snippets—not full file trees

## Environment variables

| Variable | Description |
|----------|-------------|
| `SMARTPRESCRIPTION_ROOT` | Absolute path to repo root (auto-detected if omitted) |

## Development

```bash
npm run dev          # build + start MCP on stdio
npm run reindex      # rebuild cache only
npm run build        # compile TypeScript
```

## Example: "Add patient history with pagination"

```
analyze_feature({ query: "patient history pagination" })
```

Expected guidance (based on current architecture):

- **Pending patients** feature uses `localStorage.allPatients` — not SQLite
- Relevant files: `views/pending-patients.html`, `scripts/views/pending-patients.js`, `common.js`
- No IPC handler exists yet for patient history persistence — would require new handler + possibly new SQLite tables

The MCP discovers these relationships from the codebase rather than hard-coded assumptions.

## Isolation

This MCP lives entirely under `tools/smartprescription-mcp/` and does not modify application runtime code.
