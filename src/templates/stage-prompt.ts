/**
 * Stage Prompt Template
 * Generates stage-specific implementation prompts
 */

import type { Stage, DocForgeState } from '../state/types.js';

/**
 * Render a stage prompt document
 */
export function renderStagePrompt(
    stage: Stage,
    state: DocForgeState,
    allStages: Stage[]
): string {
    const sections: string[] = [];
    const paddedId = String(stage.id).padStart(2, '0');

    // Header
    sections.push(`# Stage ${paddedId}: ${stage.name}`);
    sections.push('');
    sections.push(`> Implementation prompt for ${state.project.name}`);
    sections.push('');

    // Context Recap
    sections.push('## Context Recap');
    sections.push('');
    sections.push(`**Project:** ${state.project.name}`);
    sections.push(`**Stack:** ${state.project.stack.join(', ')}`);
    sections.push('');
    if (state.documentProgress.rfc.problem) {
        sections.push('**Problem Summary:**');
        sections.push(truncateText(state.documentProgress.rfc.problem, 200));
        sections.push('');
    }

    // Stage Scope
    sections.push('## Stage Scope');
    sections.push('');
    sections.push('### In Scope');
    sections.push('');
    stage.deliverables.forEach(d => {
        sections.push(`- ${d}`);
    });
    sections.push('');

    // Non-Goals for this stage
    sections.push('### Non-Goals (This Stage)');
    sections.push('');
    const futureDeliverables = allStages
        .filter(s => s.id > stage.id)
        .flatMap(s => s.deliverables)
        .slice(0, 5);
    if (futureDeliverables.length > 0) {
        sections.push('Do not implement in this stage (handled later):');
        futureDeliverables.forEach(d => {
            sections.push(`- ${d}`);
        });
    } else {
        sections.push('- Final stage: ensure all previous non-goals are addressed');
    }
    sections.push('');

    // Dependencies
    if (stage.dependencies.length > 0) {
        sections.push('## Dependencies');
        sections.push('');
        sections.push('Ensure the following are complete before starting:');
        stage.dependencies.forEach(d => {
            sections.push(`- [ ] ${d}`);
        });
        sections.push('');
    }

    // Concrete Tasks
    sections.push('## Tasks');
    sections.push('');
    sections.push('### Implementation Checklist');
    sections.push('');
    stage.deliverables.forEach((d, index) => {
        sections.push(`${index + 1}. [ ] **${d}**`);
        sections.push('   - File(s): _specify target files_');
        sections.push('   - Approach: _describe implementation steps_');
        sections.push('');
    });

    // Required Tests/Validation
    sections.push('## Required Validation');
    sections.push('');
    sections.push('### Acceptance Criteria');
    sections.push('');
    stage.acceptanceCriteria.forEach(c => {
        sections.push(`- [ ] ${c}`);
    });
    sections.push('');
    sections.push('### Testing Requirements');
    sections.push('');
    sections.push(stage.validationNotes);
    sections.push('');

    // Checkpoint Questions
    sections.push('## Checkpoint Questions');
    sections.push('');
    sections.push('Before proceeding to the next stage, answer:');
    sections.push('');
    sections.push('1. Have all deliverables been implemented?');
    sections.push('2. Do all acceptance criteria pass?');
    sections.push('3. Are there any blockers for the next stage?');
    sections.push('4. Any technical debt to document?');
    sections.push('');

    // Don't Proceed Until
    sections.push('## ⛔ Don\'t Proceed Until');
    sections.push('');
    sections.push('- [ ] All deliverables are complete');
    sections.push('- [ ] All acceptance criteria verified');
    sections.push(`- [ ] ${stage.definitionOfDone}`);
    sections.push('- [ ] Code reviewed (if applicable)');
    sections.push('- [ ] Tests passing');
    sections.push('');

    // Definition of Done
    sections.push('---');
    sections.push('');
    sections.push(`**Definition of Done:** ${stage.definitionOfDone}`);

    return sections.join('\n');
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}
