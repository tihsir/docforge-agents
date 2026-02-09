/**
 * State machine for DocForge workflow progression
 */

import type { StepId, DocForgeState } from './types.js';

/** Step definition with metadata */
interface StepDefinition {
    id: StepId;
    phase: 'rfc' | 'plan' | 'rollout' | 'prompts';
    label: string;
    isCheckpoint: boolean;
    next: StepId | null;
}

/** All steps in the workflow */
const STEPS: Record<StepId, StepDefinition> = {
    // RFC Phase
    'rfc.problem': {
        id: 'rfc.problem',
        phase: 'rfc',
        label: 'Problem Statement',
        isCheckpoint: true,
        next: 'rfc.goals',
    },
    'rfc.goals': {
        id: 'rfc.goals',
        phase: 'rfc',
        label: 'Goals and Non-Goals',
        isCheckpoint: true,
        next: 'rfc.approach',
    },
    'rfc.approach': {
        id: 'rfc.approach',
        phase: 'rfc',
        label: 'Approach',
        isCheckpoint: true,
        next: 'rfc.interfaces',
    },
    'rfc.interfaces': {
        id: 'rfc.interfaces',
        phase: 'rfc',
        label: 'Interfaces & Contracts',
        isCheckpoint: true,
        next: 'rfc.alternatives',
    },
    'rfc.alternatives': {
        id: 'rfc.alternatives',
        phase: 'rfc',
        label: 'Alternatives & Tradeoffs',
        isCheckpoint: true,
        next: 'rfc.complete',
    },
    'rfc.complete': {
        id: 'rfc.complete',
        phase: 'rfc',
        label: 'RFC Complete',
        isCheckpoint: false,
        next: 'plan.stages',
    },

    // Plan Phase
    'plan.stages': {
        id: 'plan.stages',
        phase: 'plan',
        label: 'Stage Breakdown',
        isCheckpoint: true,
        next: 'plan.criteria',
    },
    'plan.criteria': {
        id: 'plan.criteria',
        phase: 'plan',
        label: 'Acceptance Criteria',
        isCheckpoint: true,
        next: 'plan.complete',
    },
    'plan.complete': {
        id: 'plan.complete',
        phase: 'plan',
        label: 'Plan Complete',
        isCheckpoint: false,
        next: 'rollout.risks',
    },

    // Rollout Phase
    'rollout.risks': {
        id: 'rollout.risks',
        phase: 'rollout',
        label: 'Risk Analysis',
        isCheckpoint: true,
        next: 'rollout.observability',
    },
    'rollout.observability': {
        id: 'rollout.observability',
        phase: 'rollout',
        label: 'Observability Plan',
        isCheckpoint: true,
        next: 'rollout.procedures',
    },
    'rollout.procedures': {
        id: 'rollout.procedures',
        phase: 'rollout',
        label: 'Rollout & Rollback Procedures',
        isCheckpoint: true,
        next: 'rollout.complete',
    },
    'rollout.complete': {
        id: 'rollout.complete',
        phase: 'rollout',
        label: 'Rollout Complete',
        isCheckpoint: false,
        next: 'prompts.generate',
    },

    // Prompts Phase
    'prompts.generate': {
        id: 'prompts.generate',
        phase: 'prompts',
        label: 'Generate Stage Prompts',
        isCheckpoint: false,
        next: 'complete',
    },
    'complete': {
        id: 'complete',
        phase: 'prompts',
        label: 'All Complete',
        isCheckpoint: false,
        next: null,
    },
};

/**
 * Get the definition for a step
 */
export function getStep(stepId: StepId): StepDefinition {
    return STEPS[stepId];
}

/**
 * Get the next step in the workflow
 */
export function getNextStep(currentStepId: StepId): StepId | null {
    return STEPS[currentStepId].next;
}

/**
 * Check if a step is a checkpoint
 */
export function isCheckpoint(stepId: StepId): boolean {
    return STEPS[stepId].isCheckpoint;
}

/**
 * Get the phase for a step
 */
export function getPhase(stepId: StepId): 'rfc' | 'plan' | 'rollout' | 'prompts' {
    return STEPS[stepId].phase;
}

/**
 * Get a human-readable label for a step
 */
export function getStepLabel(stepId: StepId): string {
    return STEPS[stepId].label;
}

/**
 * Advance to the next step
 */
export function advanceStep(state: DocForgeState): StepId | null {
    const nextStep = getNextStep(state.currentStep);
    return nextStep;
}

/**
 * Get all steps for a phase
 */
export function getPhaseSteps(phase: 'rfc' | 'plan' | 'rollout' | 'prompts'): StepDefinition[] {
    return Object.values(STEPS).filter(step => step.phase === phase);
}

/**
 * Check if a phase is complete
 */
export function isPhaseComplete(state: DocForgeState, phase: 'rfc' | 'plan' | 'rollout'): boolean {
    const completeStepId = `${phase}.complete` as StepId;
    const currentPhase = getPhase(state.currentStep);

    // If we're past this phase, it's complete
    const phaseOrder = ['rfc', 'plan', 'rollout', 'prompts'];
    const currentPhaseIndex = phaseOrder.indexOf(currentPhase);
    const targetPhaseIndex = phaseOrder.indexOf(phase);

    return currentPhaseIndex > targetPhaseIndex || state.currentStep === completeStepId;
}

/**
 * Get progress percentage
 */
export function getProgressPercentage(state: DocForgeState): number {
    const allSteps = Object.keys(STEPS);
    const currentIndex = allSteps.indexOf(state.currentStep);
    return Math.round((currentIndex / (allSteps.length - 1)) * 100);
}

/**
 * Get remaining steps count
 */
export function getRemainingSteps(state: DocForgeState): number {
    const allSteps = Object.keys(STEPS);
    const currentIndex = allSteps.indexOf(state.currentStep);
    return allSteps.length - currentIndex - 1;
}
