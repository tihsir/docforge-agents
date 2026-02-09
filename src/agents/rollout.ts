/**
 * Rollout Agent
 * Generates ROLLOUT document
 */

import { z } from 'zod';
import { BaseAgent } from './base.js';
import type { DocForgeState, StepId, Risk } from '../state/types.js';
import { saveState } from '../state/store.js';

/** Risk schema */
const RiskSchema = z.object({
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    mitigation: z.string(),
});

/** Risks schema */
const RisksSchema = z.object({
    risks: z.array(RiskSchema),
});

/** Observability schema */
const ObservabilitySchema = z.object({
    monitoring: z.string().describe('Monitoring approach'),
    logging: z.string().describe('Logging strategy'),
    alerts: z.string().describe('Alerting setup'),
});

/** Procedures schema */
const ProceduresSchema = z.object({
    rolloutSteps: z.array(z.string()).describe('Step-by-step rollout'),
    killSwitch: z.string().describe('How to quickly disable'),
    rollback: z.string().describe('How to rollback'),
    stopConditions: z.array(z.string()).describe('When to stop deployment'),
});

/**
 * Rollout Agent generates the ROLLOUT document
 */
export class RolloutAgent extends BaseAgent {
    get name(): string {
        return 'RolloutAgent';
    }

    async generateStep(
        state: DocForgeState,
        stepId: StepId
    ): Promise<{ state: DocForgeState; content: string }> {
        switch (stepId) {
            case 'rollout.risks':
                return this.generateRisks(state);
            case 'rollout.observability':
                return this.generateObservability(state);
            case 'rollout.procedures':
                return this.generateProcedures(state);
            default:
                throw new Error(`RolloutAgent cannot handle step: ${stepId}`);
        }
    }

    private async generateRisks(
        state: DocForgeState
    ): Promise<{ state: DocForgeState; content: string }> {
        this.announce('Identifying Risks...');

        const systemPrompt = this.buildSystemPrompt(state);
        const stages = state.documentProgress.plan.stages || [];
        const stagesText = stages.map(s => `Stage ${s.id}: ${s.name} - ${s.deliverables.join(', ')}`).join('\n');

        const userPrompt = `Analyze risks for this project rollout:

Project: ${state.project.name}
Approach: ${state.documentProgress.rfc.approach}

Stages:
${stagesText}

Identify at least 4 risks:
- Technical risks (dependencies, integration, performance)
- Operational risks (deployment, monitoring)
- Process risks (timeline, resources)

Rate each by severity and provide mitigation strategies.`;

        const result = await this.chatJson<z.infer<typeof RisksSchema>>(
            [{ role: 'user', content: userPrompt }],
            RisksSchema,
            { systemPrompt }
        );

        state.documentProgress.rollout.risks = result.risks as Risk[];
        await saveState(state, this.cwd);

        const content = this.formatRisks(result.risks);
        return { state, content };
    }

    private async generateObservability(
        state: DocForgeState
    ): Promise<{ state: DocForgeState; content: string }> {
        this.announce('Defining Observability Plan...');

        const feedback = this.getRelevantFeedback(state, 'rollout');
        const systemPrompt = this.buildSystemPrompt(state);
        const userPrompt = `Define an observability plan for:

Project: ${state.project.name}
Stack: ${state.project.stack.join(', ')}
Approach: ${state.documentProgress.rfc.approach}

Cover:
1. What to monitor (metrics, health checks)
2. Logging strategy (levels, key events)
3. Alerting (thresholds, notification channels)
${feedback}`;

        const result = await this.chatJson<z.infer<typeof ObservabilitySchema>>(
            [{ role: 'user', content: userPrompt }],
            ObservabilitySchema,
            { systemPrompt }
        );

        const content = `### Monitoring\n${result.monitoring}\n\n### Logging\n${result.logging}\n\n### Alerts\n${result.alerts}`;
        state.documentProgress.rollout.observability = content;
        await saveState(state, this.cwd);

        return { state, content };
    }

    private async generateProcedures(
        state: DocForgeState
    ): Promise<{ state: DocForgeState; content: string }> {
        this.announce('Drafting Rollout Procedures...');

        const feedback = this.getRelevantFeedback(state, 'rollout');
        const systemPrompt = this.buildSystemPrompt(state);
        const stages = state.documentProgress.plan.stages || [];
        const stagesText = stages.map(s => `Stage ${s.id}: ${s.name}`).join('\n');

        const userPrompt = `Create rollout and rollback procedures for:

Project: ${state.project.name}
Stages:
${stagesText}

Provide:
1. Step-by-step rollout procedure (at least 5 steps)
2. Kill switch mechanism (how to quickly disable)
3. Rollback procedure
4. Stop-the-line conditions (when to halt deployment)
${feedback}`;

        const result = await this.chatJson<z.infer<typeof ProceduresSchema>>(
            [{ role: 'user', content: userPrompt }],
            ProceduresSchema,
            { systemPrompt }
        );

        state.documentProgress.rollout.rolloutSteps = result.rolloutSteps;
        state.documentProgress.rollout.killSwitch = result.killSwitch;
        state.documentProgress.rollout.rollback = result.rollback;
        state.documentProgress.rollout.stopConditions = result.stopConditions;
        await saveState(state, this.cwd);

        const content = this.formatProcedures(result);
        return { state, content };
    }

    private formatRisks(risks: z.infer<typeof RisksSchema>['risks']): string {
        const severityEmoji: Record<string, string> = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
        };

        return risks
            .map(r => {
                const emoji = severityEmoji[r.severity] || '⚪';
                return `${emoji} **${r.severity.toUpperCase()}**: ${r.description}\n   Mitigation: ${r.mitigation}`;
            })
            .join('\n\n');
    }

    private formatProcedures(result: z.infer<typeof ProceduresSchema>): string {
        const rolloutSteps = result.rolloutSteps
            .map((s, i) => `${i + 1}. ${s}`)
            .join('\n');

        const stopConditions = result.stopConditions
            .map(c => `- ⛔ ${c}`)
            .join('\n');

        return `### Rollout Steps
${rolloutSteps}

### Kill Switch
${result.killSwitch}

### Rollback Procedure
${result.rollback}

### Stop Conditions
${stopConditions}`;
    }
}
