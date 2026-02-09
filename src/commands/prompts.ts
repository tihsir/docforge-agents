/**
 * prompts command
 * Generate stage-specific implementation prompts
 */

import { Command } from 'commander';
import { loadState, areAllDocumentsApproved, saveState } from '../state/store.js';
import { getProvider, isProviderAvailable } from '../providers/factory.js';
import { PromptAgent } from '../agents/prompt.js';
import * as console from '../utils/console.js';
import type { DocForgeState } from '../state/types.js';

export const promptsCommand = new Command('prompts')
    .description('Generate stage-specific implementation prompts')
    .option('--force', 'Generate prompts even if documents not all approved')
    .option('--stage <number>', 'Regenerate a specific stage prompt')
    .action(async (options) => {
        console.header('DocForge Agents - Generate Prompts');

        // Load state
        let state: DocForgeState;
        try {
            state = await loadState();
        } catch (error) {
            console.error('No DocForge project found. Run "docforge init" first.');
            process.exit(1);
        }

        // Check if all documents are approved
        if (!areAllDocumentsApproved(state) && !options.force) {
            console.error('Not all documents are approved.');
            console.info('Run "docforge approve all" first, or use --force to generate anyway.');

            // Show which docs need approval
            console.section('Approval Status');
            const docs: ('rfc' | 'plan' | 'rollout')[] = ['rfc', 'plan', 'rollout'];
            for (const doc of docs) {
                const approved = state.approvals.some(a => a.documentType === doc);
                console.documentStatus(`${doc.toUpperCase()}.md`, approved);
            }

            process.exit(1);
        }

        // Check if stages exist
        const stages = state.documentProgress.plan.stages;
        if (!stages || stages.length === 0) {
            console.error('No stages defined in PLAN. Complete document generation first.');
            process.exit(1);
        }

        // Get provider (mock is fine for prompt generation)
        let provider;
        if (isProviderAvailable()) {
            provider = getProvider();
        } else {
            // Use mock for template-based generation
            const { createMockProvider } = await import('../providers/mock.js');
            provider = createMockProvider();
        }

        const promptAgent = new PromptAgent(provider);

        // Handle single stage regeneration
        if (options.stage !== undefined) {
            const stageNumber = parseInt(options.stage, 10);
            if (isNaN(stageNumber)) {
                console.error('Invalid stage number.');
                process.exit(1);
            }

            try {
                const filePath = await promptAgent.regenerateStage(state, stageNumber);
                console.success(`Regenerated: ${filePath}`);
            } catch (error) {
                console.error((error as Error).message);
                process.exit(1);
            }
            return;
        }

        // Generate all prompts
        try {
            const result = await promptAgent.generateStep(state, 'prompts.generate');
            state = result.state;

            // Update state to complete
            state.currentStep = 'complete';
            await saveState(state);

            console.blank();
            console.success('All stage prompts generated!');
            console.section('Generated Files');
            stages.forEach((stage) => {
                const paddedId = String(stage.id).padStart(2, '0');
                console.info(`  prompts/Stage-${paddedId}.md - ${stage.name}`);
            });
            console.blank();
            console.section('Next Steps');
            console.info('Review the generated prompts in the prompts/ directory.');
            console.info('Use each Stage-XX.md as context for implementing that stage.');
        } catch (error) {
            console.error(`Error: ${(error as Error).message}`);
            process.exit(1);
        }
    });
