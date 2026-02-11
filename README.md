# DocForge Agents

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AI-assisted CLI tool for generating senior-level planning artifacts through collaborative document generation.

## Overview

DocForge Agents helps development teams create comprehensive planning documentation through an interactive, checkpoint-based workflow. It generates:

- **RFC.md** - Combined RFC with problem statement, goals, approach, interfaces, and alternatives
- **PLAN.md** - Staged execution checklist with acceptance criteria
- **ROLLOUT.md** - Risk analysis, observability, and rollout/rollback procedures
- **Stage-XX.md** - Implementation prompts for each stage

## Features

- 🤖 **AI-Assisted Generation** - Uses LLM to draft document sections
- ✅ **Checkpoint-Based Review** - Review and refine at each step
- 📋 **State Persistence** - Resume work at any checkpoint
- 🔒 **Approval Tracking** - Hash-verified document approvals
- 🎯 **Strict Mode** - Block approval if required sections missing
- 🔌 **Pluggable Providers** - Support for OpenAI and mock providers

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/docforge-agents.git
cd docforge-agents

# Install dependencies
npm install

# Build
npm run build

# Link for global CLI access
npm link
```

## Quick Start

### 1. Initialize a Project

```bash
docforge init
```

You'll be prompted for:
- Project name
- Technology stack
- Constraints (optional)

### 2. Generate Documents

```bash
docforge continue
```

The tool will guide you through generating each document section with checkpoints:

```
═══════════════════════════════════════════════════════════════
  DocForge Agents - Continue
═══════════════════════════════════════════════════════════════

🔧 RFCAgent: Drafting Problem Statement...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📍 CHECKPOINT: Problem Statement
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── Generated: Problem Statement ──
The current system lacks proper documentation...
──────────────────────────────────────────

? (1) Do you disagree with anything so far? (press Enter to skip)
? (2) Anything unclear or want a deeper explanation? (press Enter to skip)
? (3) Any constraints we missed (stack, time, infra, cost)? (press Enter to skip)
? Continue to the next step? (Y/n)
```

### 3. Review Documents

```bash
docforge review              # Review all documents
docforge review rfc          # Review specific document
docforge review --diff       # Show changes since approval
```

### 4. Approve Documents

```bash
docforge approve rfc         # Approve RFC
docforge approve all         # Approve all documents
docforge approve all --force # Force approval (skip validation)
```

### 5. Generate Stage Prompts

```bash
docforge prompts             # Generate all stage prompts
docforge prompts --stage 1   # Regenerate specific stage
```

## Configuration

### Environment Variables

```bash
# LLM Provider (default: openai)
DOCFORGE_PROVIDER=openai     # or 'mock' or 'gemini'

# OpenAI Configuration
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-4o          # optional, default: gpt-4o
OPENAI_BASE_URL=...          # optional, for API-compatible endpoints
 
 # Gemini Configuration
 GEMINI_API_KEY=your-api-key
 GEMINI_MODEL=gemini-1.5-pro  # optional, default: gemini-1.5-pro
```

### Strict Mode

Enable strict mode to block approvals when required sections are missing:

```bash
docforge init --strict
```

## Commands

| Command | Description |
|---------|-------------|
| `docforge init` | Initialize a new DocForge project |
| `docforge continue` | Continue document generation from last checkpoint |
| `docforge review [doc]` | Review document status and content |
| `docforge approve <doc>` | Approve documents (rfc, plan, rollout, or all) |
| `docforge prompts` | Generate stage-specific implementation prompts |

## Project Structure

```
your-project/
├── .docforge/
│   └── state.json       # Project state and approvals
├── docs/
│   ├── RFC.md           # Generated RFC document
│   ├── PLAN.md          # Generated plan document
│   └── ROLLOUT.md       # Generated rollout document
└── prompts/
    ├── Stage-00.md      # Stage 0 implementation prompt
    ├── Stage-01.md      # Stage 1 implementation prompt
    └── ...
```

## State File

The `.docforge/state.json` file tracks:

```json
{
  "version": 1,
  "project": {
    "name": "My Project",
    "stack": ["TypeScript", "Node.js"],
    "constraints": ["Must work offline"]
  },
  "currentStep": "rfc.goals",
  "checkpointResponses": [...],
  "approvals": [
    {
      "documentType": "rfc",
      "contentHash": "abc123...",
      "approvedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "documentHashes": {...},
  "strictMode": false
}
```

## Document Templates

### RFC.md Sections

- Problem Statement
- Goals / Non-Goals
- Proposed Approach
- Interfaces & Contracts
- Alternatives Considered
- Open Questions
- Assumptions

### PLAN.md Sections

- Overview with constraints
- Stage breakdown (Stage 00, 01, ...)
  - Deliverables
  - Dependencies
  - Acceptance Criteria
  - Definition of Done
  - Validation Notes

### ROLLOUT.md Sections

- Key Risks (with severity table)
- Observability
- Rollout Steps
- Kill Switch
- Rollback Procedure
- Stop-the-Line Conditions

### Stage-XX.md Sections

- Context Recap
- Stage Scope (In Scope / Non-Goals)
- Dependencies
- Tasks with file-level guidance
- Required Validation
- Checkpoint Questions
- "Don't Proceed Until" checklist

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build
npm run build

# Development mode (watch)
npm run dev

# Lint
npm run lint
```

## Architecture

```
src/
├── cli.ts           # CLI entry point
├── commands/        # CLI command implementations
├── agents/          # Document generation agents
│   ├── base.ts      # Base agent with common functionality
│   ├── rfc.ts       # RFC document agent
│   ├── planner.ts   # Plan document agent
│   ├── rollout.ts   # Rollout document agent
│   ├── prompt.ts    # Stage prompt agent
│   └── critic.ts    # Cross-document consistency checker
├── providers/       # LLM provider abstraction
│   ├── types.ts     # Provider interface
│   ├── openai.ts    # OpenAI implementation
│   └── mock.ts      # Mock provider for testing
├── state/           # State management
│   ├── types.ts     # State type definitions
│   ├── store.ts     # State persistence
│   └── machine.ts   # Workflow state machine
├── templates/       # Document templates
│   ├── rfc.ts       # RFC markdown template
│   ├── plan.ts      # Plan markdown template
│   ├── rollout.ts   # Rollout markdown template
│   └── stage-prompt.ts # Stage prompt template
└── utils/           # Utilities
    ├── console.ts   # Console output helpers
    ├── files.ts     # File system helpers
    ├── hash.ts      # Content hashing
    └── validation.ts # Document validation
```

## Using Mock Provider

For testing without an API key:

```bash
DOCFORGE_PROVIDER=mock docforge continue
```

The mock provider returns deterministic, realistic content for all document sections.

## License

MIT - see [LICENSE](LICENSE)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
