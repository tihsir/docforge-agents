/**
 * Prompt Agent
 * Generates stage-specific implementation prompts
 */

import { BaseAgent } from './base.js';
import type { DocForgeState, StepId } from '../state/types.js';
import { renderStagePrompt } from '../templates/stage-prompt.js';
import { writeFileSafe, getStagePromptPath, ensureDir, getPromptsDir } from '../utils/files.js';
import * as console from '../utils/console.js';

/**
 * Prompt Agent generates stage prompt files
 */
export class PromptAgent extends BaseAgent {
    get name(): string {
        return 'PromptAgent';
    }

    async generateStep(
        state: DocForgeState,
        stepId: StepId
    ): Promise<{ state: DocForgeState; content: string }> {
        if (stepId !== 'prompts.generate') {
            throw new Error(`PromptAgent cannot handle step: ${stepId}`);
        }

        return this.generatePrompts(state);
    }

    private async generatePrompts(
        state: DocForgeState
    ): Promise<{ state: DocForgeState; content: string }> {
        this.announce('Generating Stage Prompts...');

        const stages = state.documentProgress.plan.stages;
        if (!stages || stages.length === 0) {
            throw new Error('No stages defined. Complete PLAN first.');
        }

        // Ensure prompts directory exists
        await ensureDir(getPromptsDir(this.cwd));

        const generatedFiles: string[] = [];

        for (const stage of stages) {
            const promptContent = renderStagePrompt(stage, state, stages);
            const filePath = getStagePromptPath(stage.id, this.cwd);
            await writeFileSafe(filePath, promptContent);
            generatedFiles.push(filePath);
            console.success(`Generated: Stage-${String(stage.id).padStart(2, '0')}.md`);
        }

        const content = `Generated ${generatedFiles.length} stage prompt files:\n${generatedFiles.map(f => `- ${f}`).join('\n')}`;
        return { state, content };
    }

    /**
     * Regenerate a single stage prompt
     */
    async regenerateStage(state: DocForgeState, stageId: number): Promise<string> {
        const stages = state.documentProgress.plan.stages;
        if (!stages) {
            throw new Error('No stages defined.');
        }

        const stage = stages.find(s => s.id === stageId);
        if (!stage) {
            throw new Error(`Stage ${stageId} not found.`);
        }

        const promptContent = renderStagePrompt(stage, state, stages);
        const filePath = getStagePromptPath(stageId, this.cwd);
        await writeFileSafe(filePath, promptContent);

        return filePath;
    }
}
