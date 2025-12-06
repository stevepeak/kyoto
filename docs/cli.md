# CLI Flow Documentation

This document describes the Kyoto CLI workflow and how each command orchestrates the flow from code analysis to wiki generation.

## Overview

The Kyoto CLI follows a sequential workflow to transform code files into organized, documented user behavior stories:

```
discover → organize → dedupe → wiki
```

All commands operate within the `.kyoto` directory at the git repository root.

## Command Flow

### 1. Discover

**Command:** `kyoto discover <filePath>`

**Objective:** Analyze TypeScript/JavaScript code files and generate user behavior stories as JSON files.

**What it does:**
- Scans the provided file or directory for TypeScript files
- Uses an AI agent to analyze code and discover user behaviors
- For each behavior, generates an enriched story with:
  - Title
  - Behavior description
  - Dependencies (entry points, exit points, prerequisites, side effects)
  - Acceptance criteria
  - Assumptions
  - Code references (file paths and line numbers)
- Writes each story as a JSON file in `.kyoto/`

**File Structure Created:**
```
.kyoto/
├── user-views-signin-component.json
├── client-sends-post-request-to-auth-endpoint.json
├── user-navigates-to-dashboard.json
└── ...
```

**Story JSON Format:**
```json
{
  "title": "User views the signin component",
  "behavior": "As a user, I can view the signin component...",
  "dependencies": {
    "entry": "User navigates to /auth/signin",
    "exit": "User is redirected to dashboard",
    "prerequisites": ["User is not authenticated"],
    "sideEffects": ["Session cookie is set"]
  },
  "acceptanceCriteria": ["Component renders correctly", "..."],
  "assumptions": ["User has valid credentials", "..."],
  "codeReferences": [
    {
      "file": "app/auth/signin.tsx",
      "lines": "12-45",
      "description": "Signin component implementation"
    }
  ]
}
```

**Key Features:**
- Can process single files or entire directories
- Supports `--limit` flag to cap the number of stories generated
- Enrichment happens automatically during discovery (no separate enrich step)
- Files are named using sanitized story titles (lowercase, dashes, max 100 chars)

#### TODO
- [ ] move schema into packages/schema
- [ ] 

---

### 2. Organize

**Command:** `kyoto organize`

**Objective:** Organize story files into a logical directory hierarchy based on domain, user journey, and technical area.

**What it does:**
1. Reads all story JSON files from `.kyoto/` (flat structure)
2. Uses an AI agent to analyze all stories and generate a directory hierarchy
3. Creates the directory structure within `.kyoto/`
4. Uses another AI agent to determine the best location for each story file
5. Moves each story file into its appropriate directory

**File Structure Created:**
```
.kyoto/
├── auth/
│   ├── signin.json
│   └── signup.json
├── users/
│   ├── preferences.json
│   └── profile.json
├── api/
│   └── webhooks/
│       └── github.json
└── ...
```

**Key Features:**
- If directories already exist, reuses the existing structure
- Creates 2-3 level deep hierarchies (shallow by default)
- Groups stories by:
  - Domain/feature area (e.g., authentication, user management)
  - User journey (e.g., signup, login, dashboard)
  - Technical area (e.g., api, errors, loading)
- Each directory has a clear purpose and description
- Files are moved (not copied) to their new locations

**Directory Naming:**
- Lowercase folder names
- Descriptive (e.g., "users", "auth", "api", "errors")
- Paths relative to `.kyoto/` (e.g., "users/preference")

---

### 3. Dedupe

**Command:** `kyoto dedupe [--threshold 0.85] [--folder <path>]`

**Objective:** Find and eliminate duplicate stories using semantic similarity analysis.

**What it does:**
1. Recursively reads all story JSON files from `.kyoto/` (or a specific folder)
2. Uses semantic similarity to compare story behaviors
3. Groups stories that exceed the similarity threshold (default: 0.85)
4. For each duplicate group, keeps the oldest file (by modification time)
5. Deletes the duplicate files

**File Structure:**
- No structural changes, only file deletions
- Removes duplicate files while preserving the oldest version

**Key Features:**
- Similarity threshold: 0.0-1.0 (higher = more similar required)
- Can target a specific folder with `--folder` flag
- Keeps the oldest file in each duplicate group
- Shows duplicate groups before deletion
- Safe: only deletes files that are semantically similar

**Example:**
If two stories are found:
- `.kyoto/auth/signin.json` (older)
- `.kyoto/users/signin.json` (newer, duplicate)

The command will delete `.kyoto/users/signin.json` and keep `.kyoto/auth/signin.json`.

---

### 4. Wiki

**Command:** `kyoto wiki`

**Objective:** Generate comprehensive markdown documentation from organized story files.

**What it does:**
1. Validates that story files are properly structured
2. Discovers the folder hierarchy in `.kyoto/`
3. For each folder (processed bottom-up):
   - Reads all story files in that folder
   - Generates a domain summary using AI
   - Generates a Mermaid flow diagram using AI
   - Creates a README.md file in that folder
4. Combines all folder READMEs into a root README.md

**File Structure Created:**
```
.kyoto/
├── README.md                    # Root documentation (combined)
├── auth/
│   ├── README.md                # Auth domain documentation
│   ├── signin.json
│   └── signup.json
├── users/
│   ├── README.md                # Users domain documentation
│   ├── preferences.json
│   └── profile.json
└── api/
    └── webhooks/
        ├── README.md            # Webhooks domain documentation
        └── github.json
```

**README.md Structure (per folder):**
```markdown
# Folder Name

## Summary
[AI-generated domain summary describing the behaviors in this folder]

## Flow Diagram
```mermaid
[AI-generated Mermaid diagram showing behavior flows]
```

## Stories

**Story Title**

```
Behavior description
```

<details><summary>read more details</summary>

```json
{
  "title": "...",
  "behavior": "...",
  ...
}
```

</details>
```

**Root README.md Structure:**
```markdown
# Stories Documentation

This document provides a comprehensive overview of all user behavior stories organized by domain.

---

[All folder READMEs combined, organized by depth level]
```

**Key Features:**
- Processes folders bottom-up (deepest first)
- Only processes folders that contain story files (not empty subfolders)
- Each folder gets its own README.md with:
  - Domain summary
  - Mermaid flow diagram
  - All stories in that folder
- Root README.md combines everything for easy navigation
- Stories are displayed with expandable details sections

---

## Complete File Structure Evolution

### After Discover
```
.kyoto/
├── story-1.json
├── story-2.json
├── story-3.json
└── ...
```

### After Organize
```
.kyoto/
├── auth/
│   ├── story-1.json
│   └── story-2.json
├── users/
│   └── story-3.json
└── ...
```

### After Dedupe
```
.kyoto/
├── auth/
│   ├── story-1.json
│   └── story-2.json
├── users/
│   └── story-3.json
└── ...
(duplicates removed)
```

### After Wiki
```
.kyoto/
├── README.md                    # Combined documentation
├── auth/
│   ├── README.md                # Auth domain docs
│   ├── story-1.json
│   └── story-2.json
├── users/
│   ├── README.md                # Users domain docs
│   └── story-3.json
└── ...
```

## Notes

- **Enrichment:** There is no separate "enrich" command. Enrichment (adding entry/exit points, prerequisites, side effects) happens automatically during the `discover` phase as part of the AI agent's workflow.

- **Directory Structure:** The `.kyoto` directory is always created at the git repository root, regardless of where the command is invoked from.

- **File Naming:** Story files use sanitized titles (lowercase, dashes, max 100 characters) to ensure filesystem compatibility.

- **AI Models:** All commands support `--model` and `--provider` flags to customize the AI model used (defaults to auto-detection).

- **Idempotency:** Commands can be run multiple times safely:
  - `discover` will create new stories (may create duplicates)
  - `organize` will reuse existing directories if they exist
  - `dedupe` will only delete actual duplicates
  - `wiki` will regenerate documentation (overwrites README.md files)

