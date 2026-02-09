/**
 * RFC Agent
 * Generates RFC document sections
 */

import { z } from 'zod';
import { BaseAgent } from './base.js';
import type { DocForgeState, StepId } from '../state/types.js';
import { saveState } from '../state/store.js';
import { formatGoalsList, formatAlternatives } from '../templates/rfc.js';

/** Problem statement schema */
const ProblemSchema = z.object({
    statement: z.string().describe('Clear statement of the problem'),
    impact: z.string().describe('Impact of not solving this problem'),
});

/** Goals schema */
const GoalsSchema = z.object({
    goals: z.array(z.string()).describe('What we want to achieve'),
    nonGoals: z.array(z.string()).describe('What is explicitly out of scope'),
});

/** Approach schema */
const ApproachSchema = z.object({
    approach: z.string().describe('High-level technical approach'),
    keyDecisions: z.array(z.string()).describe('Key architectural decisions'),
});

/** Interfaces schema */
const InterfacesSchema = z.object({
    api: z.string().describe('API surface and contracts'),
    dataFormat: z.string().describe('Data formats and schemas'),
    errorHandling: z.string().describe('Error handling approach'),
});

/** Alternative schema */
const AlternativeSchema = z.object({
    name: z.string(),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    decision: z.string(),
});

const AlternativesSchema = z.object({
    alternatives: z.array(AlternativeSchema),
    openQuestions: z.array(z.string()),
    assumptions: z.array(z.string()),
});

/**
 * RFC Agent generates the RFC document
 */
export class RFCAgent extends BaseAgent {
    get name(): string {
        return 'RFCAgent';
    }

    async generateStep(
        state: DocForgeState,
        stepId: StepId
    ): Promise<{ state: DocForgeState; content: string }> {
        switch (stepId) {
            case 'rfc.problem':
                return this.generateProblem(state);
            case 'rfc.goals':
                return this.generateGoals(state);
            case 'rfc.approach':
                return this.generateApproach(state);
            case 'rfc.interfaces':
                return this.generateInterfaces(state);
            case 'rfc.alternatives':
                return this.generateAlternatives(state);
            default:
                throw new Error(`RFCAgent cannot handle step: ${stepId}`);
        }
    }

    private async generateProblem(
        state: DocForgeState
    ): Promise<{ state: DocForgeState; content: string }> {
        this.announce('Drafting Problem Statement...');

        const systemPrompt = this.buildSystemPrompt(state);
        const userPrompt = `Generate a problem statement for the following project:

Project: ${state.project.name}
Stack: ${state.project.stack.join(', ')}
Constraints: ${state.project.constraints.join(', ') || 'None specified'}

Describe:
1. The core problem being solved
2. The impact of not solving it

Be concise and specific.`;

        const result = await this.chatJson<z.infer<typeof ProblemSchema>>(
            [{ role: 'user', content: userPrompt }],
            ProblemSchema,
            { systemPrompt }
        );

        const content = `${result.statement}\n\n**Impact:** ${result.impact}`;
        state.documentProgress.rfc.problem = content;
        await saveState(state, this.cwd);

        return { state, content };
    }

    private async generateGoals(
        state: DocForgeState
    ): Promise<{ state: DocForgeState; content: string }> {
        this.announce('Drafting Goals and Non-Goals...');

        const feedback = this.getRelevantFeedback(state, 'rfc');
        const systemPrompt = this.buildSystemPrompt(state);
        const userPrompt = `Based on this problem statement:

${state.documentProgress.rfc.problem}

Generate goals and non-goals for this project.

Goals should be specific, measurable outcomes.
Non-goals should clarify what is explicitly out of scope.
${feedback}`;

        const result = await this.chatJson<z.infer<typeof GoalsSchema>>(
            [{ role: 'user', content: userPrompt }],
            GoalsSchema,
            { systemPrompt }
        );

        state.documentProgress.rfc.goals = formatGoalsList(result.goals);
        state.documentProgress.rfc.nonGoals = formatGoalsList(result.nonGoals);
        await saveState(state, this.cwd);

        const content = `**Goals:**\n${state.documentProgress.rfc.goals}\n\n**Non-Goals:**\n${state.documentProgress.rfc.nonGoals}`;
        return { state, content };
    }

    private async generateApproach(
        state: DocForgeState
    ): Promise<{ state: DocForgeState; content: string }> {
        this.announce('Drafting Approach...');

        const feedback = this.getRelevantFeedback(state, 'rfc');
        const systemPrompt = this.buildSystemPrompt(state);
        const userPrompt = `Given:
Problem: ${state.documentProgress.rfc.problem}
Goals: ${state.documentProgress.rfc.goals}
Non-Goals: ${state.documentProgress.rfc.nonGoals}

Describe the high-level technical approach.
Include key architectural decisions.
${feedback}`;

        const result = await this.chatJson<z.infer<typeof ApproachSchema>>(
            [{ role: 'user', content: userPrompt }],
            ApproachSchema,
            { systemPrompt }
        );

        const keyDecisions = result.keyDecisions.map(d => `- ${d}`).join('\n');
        const content = `${result.approach}\n\n**Key Decisions:**\n${keyDecisions}`;
        state.documentProgress.rfc.approach = content;
        await saveState(state, this.cwd);

        return { state, content };
    }

    private async generateInterfaces(
        state: DocForgeState
    ): Promise<{ state: DocForgeState; content: string }> {
        this.announce('Drafting Interfaces & Contracts...');

        const feedback = this.getRelevantFeedback(state, 'rfc');
        const systemPrompt = this.buildSystemPrompt(state);
        const userPrompt = `Based on the approach:
${state.documentProgress.rfc.approach}

Define the interfaces and contracts:
- API surface (commands, functions, endpoints)
- Data formats (JSON schemas, types)
- Error handling strategy
${feedback}`;

        const result = await this.chatJson<z.infer<typeof InterfacesSchema>>(
            [{ role: 'user', content: userPrompt }],
            InterfacesSchema,
            { systemPrompt }
        );

        const content = `### API Surface\n${result.api}\n\n### Data Formats\n${result.dataFormat}\n\n### Error Handling\n${result.errorHandling}`;
        state.documentProgress.rfc.interfaces = content;
        await saveState(state, this.cwd);

        return { state, content };
    }

    private async generateAlternatives(
        state: DocForgeState
    ): Promise<{ state: DocForgeState; content: string }> {
        this.announce('Drafting Alternatives Considered...');

        const feedback = this.getRelevantFeedback(state, 'rfc');
        const systemPrompt = this.buildSystemPrompt(state);
        const userPrompt = `For this project approach:
${state.documentProgress.rfc.approach}

Generate:
1. At least 2 alternative approaches that were considered
2. Pros and cons for each
3. Why they were not chosen
4. Open questions remaining
5. Key assumptions being made
${feedback}`;

        const result = await this.chatJson<z.infer<typeof AlternativesSchema>>(
            [{ role: 'user', content: userPrompt }],
            AlternativesSchema,
            { systemPrompt }
        );

        state.documentProgress.rfc.alternatives = formatAlternatives(result.alternatives);
        state.documentProgress.rfc.openQuestions = result.openQuestions.map(q => `- ${q}`).join('\n');
        state.documentProgress.rfc.assumptions = result.assumptions.map(a => `- ${a}`).join('\n');
        await saveState(state, this.cwd);

        const content = `${state.documentProgress.rfc.alternatives}\n\n**Open Questions:**\n${state.documentProgress.rfc.openQuestions}\n\n**Assumptions:**\n${state.documentProgress.rfc.assumptions}`;
        return { state, content };
    }
}
