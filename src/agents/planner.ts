/**
 * Planner Agent
 * Generates PLAN document with stages
 */

import { z } from 'zod';
import { BaseAgent } from './base.js';
import type { DocForgeState, StepId, Stage } from '../state/types.js';
import { saveState } from '../state/store.js';

/** Stage schema */
const StageSchema = z.object({
    id: z.number(),
    name: z.string(),
    deliverables: z.array(z.string()),
    dependencies: z.array(z.string()),
    acceptanceCriteria: z.array(z.string()),
    definitionOfDone: z.string(),
    validationNotes: z.string(),
});

/** Stages schema */
const StagesSchema = z.object({
    stages: z.array(StageSchema),
});

/** Criteria refinement schema */
const CriteriaSchema = z.object({
    stages: z.array(
        z.object({
            id: z.number(),
            acceptanceCriteria: z.array(z.string()),
            definitionOfDone: z.string(),
            validationNotes: z.string(),
        })
    ),
});

/**
 * Planner Agent generates the PLAN document
 */
export class PlannerAgent extends BaseAgent {
    get name(): string {
        return 'PlannerAgent';
    }

    async generateStep(
        state: DocForgeState,
        stepId: StepId
    ): Promise<{ state: DocForgeState; content: string }> {
        switch (stepId) {
            case 'plan.stages':
                return this.generateStages(state);
            case 'plan.criteria':
                return this.refineCriteria(state);
            default:
                throw new Error(`PlannerAgent cannot handle step: ${stepId}`);
        }
    }

    private async generateStages(
        state: DocForgeState
    ): Promise<{ state: DocForgeState; content: string }> {
        this.announce('Drafting Stage Breakdown...');

        const systemPrompt = this.buildSystemPrompt(state);
        const userPrompt = `Based on the RFC:

Problem: ${state.documentProgress.rfc.problem}
Goals: ${state.documentProgress.rfc.goals}
Approach: ${state.documentProgress.rfc.approach}

Create a staged implementation plan with 3-5 stages.
Each stage should:
- Have clear deliverables
- List dependencies on previous stages
- Include initial acceptance criteria
- Be independently testable

Start with Stage 0 for foundation/setup.`;

        const result = await this.chatJson<z.infer<typeof StagesSchema>>(
            [{ role: 'user', content: userPrompt }],
            StagesSchema,
            { systemPrompt }
        );

        state.documentProgress.plan.stages = result.stages as Stage[];
        await saveState(state, this.cwd);

        const content = this.formatStagesOverview(result.stages);
        return { state, content };
    }

    private async refineCriteria(
        state: DocForgeState
    ): Promise<{ state: DocForgeState; content: string }> {
        this.announce('Refining Acceptance Criteria...');

        const stages = state.documentProgress.plan.stages;
        if (!stages || stages.length === 0) {
            throw new Error('No stages defined. Run plan.stages first.');
        }

        const feedback = this.getRelevantFeedback(state, 'plan');
        const systemPrompt = this.buildSystemPrompt(state);
        const stagesOverview = this.formatStagesOverview(stages);
        const userPrompt = `Review and refine the acceptance criteria for these stages:

${stagesOverview}

For each stage, provide:
1. Detailed, testable acceptance criteria (at least 3 per stage)
2. Clear definition of done
3. Specific validation notes (commands to run, tests to check)
${feedback}`;

        const result = await this.chatJson<z.infer<typeof CriteriaSchema>>(
            [{ role: 'user', content: userPrompt }],
            CriteriaSchema,
            { systemPrompt }
        );

        // Merge refined criteria into existing stages
        for (const refinedStage of result.stages) {
            const existingStage = stages.find(s => s.id === refinedStage.id);
            if (existingStage) {
                existingStage.acceptanceCriteria = refinedStage.acceptanceCriteria;
                existingStage.definitionOfDone = refinedStage.definitionOfDone;
                existingStage.validationNotes = refinedStage.validationNotes;
            }
        }

        await saveState(state, this.cwd);

        const content = this.formatDetailedStages(stages);
        return { state, content };
    }

    private formatStagesOverview(stages: Stage[] | z.infer<typeof StagesSchema>['stages']): string {
        return stages
            .map(s => {
                const paddedId = String(s.id).padStart(2, '0');
                const deliverables = s.deliverables.map(d => `  - ${d}`).join('\n');
                const deps = s.dependencies.length > 0 ? s.dependencies.join(', ') : 'None';
                return `Stage ${paddedId}: ${s.name}\nDeliverables:\n${deliverables}\nDependencies: ${deps}`;
            })
            .join('\n\n');
    }

    private formatDetailedStages(stages: Stage[]): string {
        return stages
            .map(s => {
                const paddedId = String(s.id).padStart(2, '0');
                const deliverables = s.deliverables.map(d => `  - ${d}`).join('\n');
                const criteria = s.acceptanceCriteria.map(c => `  - ${c}`).join('\n');
                return `Stage ${paddedId}: ${s.name}
Deliverables:
${deliverables}
Acceptance Criteria:
${criteria}
Definition of Done: ${s.definitionOfDone}
Validation: ${s.validationNotes}`;
            })
            .join('\n\n---\n\n');
    }
}
