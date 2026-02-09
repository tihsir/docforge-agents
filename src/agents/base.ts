/**
 * Base Agent Class
 * Common functionality for all document agents
 */

import inquirer from 'inquirer';
import type { LLMProvider, LLMMessage, GenerateOptions } from '../providers/types.js';
import type { DocForgeState, StepId } from '../state/types.js';
import { saveState, recordCheckpointResponse } from '../state/store.js';
import { isCheckpoint, getStepLabel, getNextStep } from '../state/machine.js';
import * as console from '../utils/console.js';

/** Checkpoint response from user */
export interface CheckpointResult {
    disagreements: string | null;
    clarifications: string | null;
    missedConstraints: string | null;
    shouldContinue: boolean;
}

/**
 * Base agent with common functionality
 */
export abstract class BaseAgent {
    protected provider: LLMProvider;

    protected cwd: string;

    constructor(provider: LLMProvider, cwd: string = process.cwd()) {
        this.provider = provider;
        this.cwd = cwd;
    }

    /** Agent name for logging */
    abstract get name(): string;

    /** Generate content for a step */
    abstract generateStep(
        state: DocForgeState,
        stepId: StepId
    ): Promise<{ state: DocForgeState; content: string }>;

    /**
     * Send a message to the LLM
     */
    protected async chat(
        messages: LLMMessage[],
        options?: Partial<GenerateOptions>
    ): Promise<string> {
        const response = await this.provider.generate({
            messages,
            ...options,
        });
        return response.content;
    }

    /**
     * Send a message and get structured JSON response
     */
    protected async chatJson<T>(
        messages: LLMMessage[],
        schema: GenerateOptions['jsonSchema'],
        options?: Partial<GenerateOptions>
    ): Promise<T> {
        const response = await this.provider.generate({
            messages,
            jsonSchema: schema,
            ...options,
        });
        return response.parsed as T;
    }

    /**
     * Announce what the agent is working on
     */
    protected announce(task: string): void {
        console.workingOn(`${this.name}: ${task}`);
    }

    /**
     * Run a checkpoint interaction with the user
     */
    protected async runCheckpoint(
        _state: DocForgeState,
        stepId: StepId,
        content: string
    ): Promise<CheckpointResult> {
        const stepLabel = getStepLabel(stepId);
        console.checkpoint(stepLabel);

        // Show the generated content
        console.content(`Generated: ${stepLabel}`, content);

        // Ask checkpoint questions
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'disagreements',
                message: '(1) Do you disagree with anything so far? (press Enter to skip)',
                default: '',
            },
            {
                type: 'input',
                name: 'clarifications',
                message: '(2) Anything unclear or want a deeper explanation? (press Enter to skip)',
                default: '',
            },
            {
                type: 'input',
                name: 'missedConstraints',
                message: '(3) Any constraints we missed (stack, time, infra, cost)? (press Enter to skip)',
                default: '',
            },
            {
                type: 'confirm',
                name: 'shouldContinue',
                message: 'Continue to the next step?',
                default: true,
            },
        ]);

        // Record the response
        await recordCheckpointResponse(
            stepId,
            answers.disagreements || null,
            answers.clarifications || null,
            answers.missedConstraints || null
        );

        return {
            disagreements: answers.disagreements || null,
            clarifications: answers.clarifications || null,
            missedConstraints: answers.missedConstraints || null,
            shouldContinue: answers.shouldContinue,
        };
    }

    /**
     * Advance to the next step if checkpoint passed
     */
    protected async advanceIfAllowed(
        state: DocForgeState,
        checkpointResult: CheckpointResult
    ): Promise<DocForgeState> {
        if (!checkpointResult.shouldContinue) {
            return state;
        }

        const nextStep = getNextStep(state.currentStep);
        if (nextStep) {
            state.currentStep = nextStep;
            await saveState(state, this.cwd);
        }

        return state;
    }

    /**
     * Check if current step is a checkpoint
     */
    protected isCheckpointStep(stepId: StepId): boolean {
        return isCheckpoint(stepId);
    }

    /**
     * Build a system prompt with project context
     */
    protected buildSystemPrompt(state: DocForgeState): string {
        return `You are an expert technical writer helping generate senior-level planning documents.

Project: ${state.project.name}
Stack: ${state.project.stack.join(', ')}
Constraints: ${state.project.constraints.join(', ') || 'None specified'}

Guidelines:
- Be concise and precise
- Use technical language appropriate for senior engineers
- Focus on actionable content
- Avoid fluff and filler text
- Structure content with clear headings and lists`;
    }

    /**
     * Get previous checkpoint responses for context
     */
    protected getRelevantFeedback(state: DocForgeState, phase: string): string {
        const relevantResponses = state.checkpointResponses
            .filter(r => r.stepId.startsWith(phase))
            .filter(r => r.disagreements || r.clarifications || r.missedConstraints);

        if (relevantResponses.length === 0) {
            return '';
        }

        const feedback = relevantResponses.map(r => {
            const parts = [];
            if (r.disagreements) parts.push(`Disagreement: ${r.disagreements}`);
            if (r.clarifications) parts.push(`Clarification needed: ${r.clarifications}`);
            if (r.missedConstraints) parts.push(`Missed constraint: ${r.missedConstraints}`);
            return `[${r.stepId}] ${parts.join('; ')}`;
        });

        return `\n\nUser Feedback from previous steps:\n${feedback.join('\n')}`;
    }
}
