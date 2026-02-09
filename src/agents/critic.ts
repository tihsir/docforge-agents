/**
 * Critic Agent
 * Performs consistency checks across documents
 */

import { z } from 'zod';
import { BaseAgent } from './base.js';
import type { DocForgeState, StepId } from '../state/types.js';
import { renderRfc } from '../templates/rfc.js';
import { renderPlan } from '../templates/plan.js';
import { renderRollout } from '../templates/rollout.js';

/** Issue schema */
const IssueSchema = z.object({
    severity: z.enum(['error', 'warning', 'info']),
    location: z.string().describe('Document and section'),
    description: z.string().describe('What is inconsistent'),
    suggestion: z.string().describe('How to fix it'),
});

/** Review schema */
const ReviewSchema = z.object({
    issues: z.array(IssueSchema),
    summary: z.string().describe('Overall assessment'),
});

/** Critic result */
export interface CriticResult {
    passed: boolean;
    issues: Array<{
        severity: 'error' | 'warning' | 'info';
        location: string;
        description: string;
        suggestion: string;
    }>;
    summary: string;
}

/**
 * Critic Agent performs consistency checks
 */
export class CriticAgent extends BaseAgent {
    get name(): string {
        return 'CriticAgent';
    }

    async generateStep(
        _state: DocForgeState,
        stepId: StepId
    ): Promise<{ state: DocForgeState; content: string }> {
        throw new Error(`CriticAgent does not generate steps. Got: ${stepId}`);
    }

    /**
     * Review all documents for consistency
     */
    async reviewAll(state: DocForgeState): Promise<CriticResult> {
        this.announce('Reviewing documents for consistency...');

        const rfc = renderRfc(state);
        const plan = renderPlan(state);
        const rollout = renderRollout(state);

        const systemPrompt = `You are a senior technical reviewer. 
Review the provided planning documents for consistency and completeness.
Flag any contradictions, gaps, or misalignments between documents.`;

        const userPrompt = `Review these planning documents for consistency:

=== RFC.md ===
${rfc}

=== PLAN.md ===
${plan}

=== ROLLOUT.md ===
${rollout}

Check for:
1. Goals in RFC align with deliverables in PLAN
2. Risks in ROLLOUT cover the approach in RFC
3. Stage dependencies are consistent
4. Acceptance criteria match stated goals
5. No contradictory statements

Report any issues found.`;

        const result = await this.chatJson<z.infer<typeof ReviewSchema>>(
            [{ role: 'user', content: userPrompt }],
            ReviewSchema,
            { systemPrompt }
        );

        const hasErrors = result.issues.some(i => i.severity === 'error');

        return {
            passed: !hasErrors,
            issues: result.issues,
            summary: result.summary,
        };
    }

    /**
     * Quick validation for a single document
     */
    async validateDocument(
        state: DocForgeState,
        documentType: 'rfc' | 'plan' | 'rollout'
    ): Promise<CriticResult> {
        this.announce(`Validating ${documentType.toUpperCase()}...`);

        let content: string;
        switch (documentType) {
            case 'rfc':
                content = renderRfc(state);
                break;
            case 'plan':
                content = renderPlan(state);
                break;
            case 'rollout':
                content = renderRollout(state);
                break;
        }

        const systemPrompt = `You are a senior technical reviewer.
Review the document for completeness and internal consistency.`;

        const userPrompt = `Review this ${documentType.toUpperCase()} document:

${content}

Check for:
1. All required sections present and complete
2. Internal consistency (no contradictions)
3. Clarity and specificity
4. Actionable content

Report any issues found.`;

        const result = await this.chatJson<z.infer<typeof ReviewSchema>>(
            [{ role: 'user', content: userPrompt }],
            ReviewSchema,
            { systemPrompt }
        );

        const hasErrors = result.issues.some(i => i.severity === 'error');

        return {
            passed: !hasErrors,
            issues: result.issues,
            summary: result.summary,
        };
    }
}
