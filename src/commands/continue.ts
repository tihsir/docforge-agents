/**
 * continue command
 * Resume document generation from last checkpoint
 */

import { Command } from 'commander';
import { loadState, saveState } from '../state/store.js';
import { getPhase, getStepLabel, getNextStep, isCheckpoint, getProgressPercentage } from '../state/machine.js';
import { getProvider } from '../providers/factory.js';
import { RFCAgent } from '../agents/rfc.js';
import { PlannerAgent } from '../agents/planner.js';
import { RolloutAgent } from '../agents/rollout.js';
import { PromptAgent } from '../agents/prompt.js';
import { renderRfc } from '../templates/rfc.js';
import { renderPlan } from '../templates/plan.js';
import { renderRollout } from '../templates/rollout.js';
import { writeFileSafe, getDocPath } from '../utils/files.js';
import * as console from '../utils/console.js';
import type { StepId, DocForgeState } from '../state/types.js';
import type { BaseAgent } from '../agents/base.js';

export const continueCommand = new Command('continue')
    .description('Continue document generation from last checkpoint')
    .option('--auto', 'Auto-approve checkpoints (for testing)')
    .action(async (options) => {
        console.header('DocForge Agents - Continue');

        // Load state
        let state: DocForgeState;
        try {
            state = await loadState();
        } catch (error) {
            console.error('No DocForge project found. Run "docforge init" first.');
            process.exit(1);
        }

        // Check if already complete
        if (state.currentStep === 'complete') {
            console.success('All documents have been generated!');
            console.info('Run "docforge review" to review documents.');
            console.info('Run "docforge approve all" to approve all documents.');
            return;
        }

        // Get provider
        let provider;
        try {
            provider = getProvider();
        } catch (error) {
            console.error((error as Error).message);
            process.exit(1);
        }

        console.info(`Resuming at: ${getStepLabel(state.currentStep)}`);
        console.info(`Progress: ${getProgressPercentage(state)}%`);
        console.blank();

        // Get appropriate agent
        const agent = getAgentForStep(state.currentStep, provider);

        // Generate content for current step
        try {
            const result = await agent.generateStep(state, state.currentStep);
            state = result.state;

            // Handle checkpoint
            if (isCheckpoint(state.currentStep)) {
                if (options.auto) {
                    // Auto-approve for testing
                    console.info('(Auto mode: skipping checkpoint)');
                } else {
                    // Run checkpoint interaction
                    const checkpointResult = await (agent as BaseAgent)['runCheckpoint'](
                        state,
                        state.currentStep,
                        result.content
                    );

                    if (!checkpointResult.shouldContinue) {
                        console.info('Stopped at checkpoint. Run "docforge continue" to resume.');
                        return;
                    }
                }
            }

            // Advance to next step
            const nextStep = getNextStep(state.currentStep);
            if (nextStep) {
                state.currentStep = nextStep;
                await saveState(state);
            }

            // Save document if phase completed
            await saveDocumentIfPhaseComplete(state);

            // Continue to next step or finish
            if (state.currentStep === 'complete') {
                console.blank();
                console.success('All documents generated!');
                console.info('Run "docforge review" to review documents.');
                console.info('Run "docforge approve all" to approve all documents.');
            } else {
                console.blank();
                console.info(`Next step: ${getStepLabel(state.currentStep)}`);
                console.info('Run "docforge continue" to proceed.');
            }
        } catch (error) {
            console.error(`Error: ${(error as Error).message}`);
            process.exit(1);
        }
    });

/**
 * Get the appropriate agent for a step
 */
function getAgentForStep(stepId: StepId, provider: ReturnType<typeof getProvider>): BaseAgent {
    const phase = getPhase(stepId);

    switch (phase) {
        case 'rfc':
            return new RFCAgent(provider);
        case 'plan':
            return new PlannerAgent(provider);
        case 'rollout':
            return new RolloutAgent(provider);
        case 'prompts':
            return new PromptAgent(provider);
        default:
            throw new Error(`Unknown phase: ${phase}`);
    }
}

/**
 * Save document to disk when a phase completes
 */
async function saveDocumentIfPhaseComplete(state: DocForgeState): Promise<void> {

    const previousStep = state.currentStep;

    // Check if we just completed a phase
    if (previousStep === 'plan.stages' || previousStep === 'rfc.complete') {
        // Just completed RFC phase - save RFC
        const rfcContent = renderRfc(state);
        await writeFileSafe(getDocPath('rfc'), rfcContent);
        console.success('Saved: docs/RFC.md');
    }

    if (previousStep === 'rollout.risks' || previousStep === 'plan.complete') {
        // Just completed Plan phase - save Plan
        const planContent = renderPlan(state);
        await writeFileSafe(getDocPath('plan'), planContent);
        console.success('Saved: docs/PLAN.md');
    }

    if (previousStep === 'prompts.generate' || previousStep === 'rollout.complete') {
        // Just completed Rollout phase - save Rollout
        const rolloutContent = renderRollout(state);
        await writeFileSafe(getDocPath('rollout'), rolloutContent);
        console.success('Saved: docs/ROLLOUT.md');
    }
}
