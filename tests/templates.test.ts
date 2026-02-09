/**
 * Template rendering unit tests
 */

import { describe, it, expect } from 'vitest';
import { renderRfc } from '../src/templates/rfc.js';
import { renderPlan, parseStages } from '../src/templates/plan.js';
import { renderRollout } from '../src/templates/rollout.js';
import { renderStagePrompt } from '../src/templates/stage-prompt.js';
import type { DocForgeState, Stage } from '../src/state/types.js';

function createTestState(): DocForgeState {
    return {
        version: 1,
        project: {
            name: 'Test Project',
            stack: ['TypeScript', 'Node.js'],
            constraints: ['Must work offline'],
            createdAt: '2024-01-01T00:00:00.000Z',
        },
        currentStep: 'rfc.complete',
        checkpointResponses: [],
        approvals: [],
        documentHashes: {},
        documentProgress: {
            rfc: {
                problem: 'The current system has significant performance issues.',
                goals: '- Improve response time by 50%\n- Reduce memory usage',
                nonGoals: '- Complete rewrite\n- Breaking API changes',
                approach: 'Incremental optimization with profiling-guided improvements.',
                interfaces: '### API\nREST endpoints remain unchanged.',
                alternatives: 'Considered complete rewrite but too risky.',
                openQuestions: '- How to handle legacy data?',
                assumptions: '- Users have modern browsers',
            },
            plan: {
                stages: [
                    {
                        id: 0,
                        name: 'Foundation',
                        deliverables: ['Setup profiling', 'Baseline metrics'],
                        dependencies: [],
                        acceptanceCriteria: ['Profiler running', 'Metrics dashboard live'],
                        definitionOfDone: 'Can measure current performance',
                        validationNotes: 'Run profiler and verify data collection',
                    },
                    {
                        id: 1,
                        name: 'Optimization',
                        deliverables: ['Database query optimization', 'Caching layer'],
                        dependencies: ['Foundation'],
                        acceptanceCriteria: ['Query time reduced', 'Cache hit rate > 80%'],
                        definitionOfDone: 'Performance target met',
                        validationNotes: 'Load test with production data',
                    },
                ],
            },
            rollout: {
                risks: [
                    { description: 'Cache invalidation bugs', severity: 'high', mitigation: 'Gradual rollout' },
                    { description: 'Performance regression', severity: 'medium', mitigation: 'A/B testing' },
                ],
                observability: 'Monitor latency percentiles and error rates.',
                rolloutSteps: ['Deploy to staging', 'Run load tests', 'Canary deployment', 'Full rollout'],
                killSwitch: 'Feature flag to disable caching',
                rollback: 'Revert to previous deployment via CI',
                stopConditions: ['Error rate > 1%', 'P99 latency > 500ms'],
            },
        },
        strictMode: false,
    };
}

describe('RFC Template', () => {
    it('should render RFC with all sections', () => {
        const state = createTestState();
        const output = renderRfc(state);

        expect(output).toContain('# RFC: Test Project');
        expect(output).toContain('## Problem Statement');
        expect(output).toContain('## Goals');
        expect(output).toContain('## Non-Goals');
        expect(output).toContain('## Proposed Approach');
        expect(output).toContain('## Interfaces & Contracts');
        expect(output).toContain('## Alternatives Considered');
        expect(output).toContain('## Open Questions');
        expect(output).toContain('## Assumptions');
    });

    it('should include project metadata', () => {
        const state = createTestState();
        const output = renderRfc(state);

        expect(output).toContain('Stack: TypeScript, Node.js');
    });

    it('should handle partial RFC content', () => {
        const state = createTestState();
        state.documentProgress.rfc = {
            problem: 'Only problem defined',
        };

        const output = renderRfc(state);
        expect(output).toContain('## Problem Statement');
        expect(output).not.toContain('## Goals');
    });
});

describe('Plan Template', () => {
    it('should render Plan with stages', () => {
        const state = createTestState();
        const output = renderPlan(state);

        expect(output).toContain('# Implementation Plan: Test Project');
        expect(output).toContain('## Stage 00: Foundation');
        expect(output).toContain('## Stage 01: Optimization');
        expect(output).toContain('### Deliverables');
        expect(output).toContain('### Acceptance Criteria');
        expect(output).toContain('### Definition of Done');
    });

    it('should include constraints', () => {
        const state = createTestState();
        const output = renderPlan(state);

        expect(output).toContain('Must work offline');
    });

    it('should parse stages from content', () => {
        const content = `
## Stage 00: Setup
### Deliverables
- First item
- Second item
### Dependencies
- None
### Acceptance Criteria
- Works
### Definition of Done
Ready for next stage
### Validation Notes
Check it

## Stage 01: Build
### Deliverables
- Build thing
### Dependencies
- Setup
### Acceptance Criteria
- Built
### Definition of Done
Complete
### Validation Notes
Test it
`;

        const stages = parseStages(content);
        expect(stages).toHaveLength(2);
        expect(stages[0].name).toBe('Setup');
        expect(stages[0].deliverables).toContain('First item');
        expect(stages[1].dependencies).toContain('Setup');
    });
});

describe('Rollout Template', () => {
    it('should render Rollout with all sections', () => {
        const state = createTestState();
        const output = renderRollout(state);

        expect(output).toContain('# Rollout Plan: Test Project');
        expect(output).toContain('## Key Risks');
        expect(output).toContain('## Observability');
        expect(output).toContain('## Rollout Steps');
        expect(output).toContain('## Kill Switch');
        expect(output).toContain('## Rollback Procedure');
        expect(output).toContain('## Stop-the-Line Conditions');
    });

    it('should include risk table', () => {
        const state = createTestState();
        const output = renderRollout(state);

        expect(output).toContain('| Risk | Severity | Mitigation |');
        expect(output).toContain('Cache invalidation bugs');
        expect(output).toContain('🟠 high');
    });

    it('should include stop conditions with warning emoji', () => {
        const state = createTestState();
        const output = renderRollout(state);

        expect(output).toContain('⛔ Error rate > 1%');
        expect(output).toContain('⛔ P99 latency > 500ms');
    });
});

describe('Stage Prompt Template', () => {
    it('should render stage prompt with all sections', () => {
        const state = createTestState();
        const stages = state.documentProgress.plan.stages!;
        const output = renderStagePrompt(stages[0], state, stages);

        expect(output).toContain('# Stage 00: Foundation');
        expect(output).toContain('## Context Recap');
        expect(output).toContain('## Stage Scope');
        expect(output).toContain('### In Scope');
        expect(output).toContain('### Non-Goals (This Stage)');
        expect(output).toContain('## Tasks');
        expect(output).toContain('## Required Validation');
        expect(output).toContain("## ⛔ Don't Proceed Until");
    });

    it('should include future deliverables as non-goals', () => {
        const state = createTestState();
        const stages = state.documentProgress.plan.stages!;
        const output = renderStagePrompt(stages[0], state, stages);

        expect(output).toContain('Database query optimization');
        expect(output).toContain('Caching layer');
    });

    it('should include project context', () => {
        const state = createTestState();
        const stages = state.documentProgress.plan.stages!;
        const output = renderStagePrompt(stages[0], state, stages);

        expect(output).toContain('**Project:** Test Project');
        expect(output).toContain('**Stack:** TypeScript, Node.js');
    });
});
