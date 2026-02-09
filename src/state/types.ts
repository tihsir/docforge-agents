/**
 * State type definitions for DocForge
 */

/** Project metadata captured during init */
export interface ProjectMetadata {
    name: string;
    stack: string[];
    constraints: string[];
    createdAt: string;
}

/** Checkpoint response from user */
export interface CheckpointResponse {
    stepId: string;
    disagreements: string | null;
    clarifications: string | null;
    missedConstraints: string | null;
    respondedAt: string;
}

/** Document approval record */
export interface Approval {
    documentType: DocumentType;
    contentHash: string;
    approvedAt: string;
}

/** Document types that can be generated */
export type DocumentType = 'rfc' | 'plan' | 'rollout';

/** All possible step identifiers in the workflow */
export type StepId =
    // RFC steps
    | 'rfc.problem'
    | 'rfc.goals'
    | 'rfc.approach'
    | 'rfc.interfaces'
    | 'rfc.alternatives'
    | 'rfc.complete'
    // Plan steps
    | 'plan.stages'
    | 'plan.criteria'
    | 'plan.complete'
    // Rollout steps
    | 'rollout.risks'
    | 'rollout.observability'
    | 'rollout.procedures'
    | 'rollout.complete'
    // Prompts step
    | 'prompts.generate'
    | 'complete';

/** Document generation progress */
export interface DocumentProgress {
    rfc: {
        problem?: string;
        goals?: string;
        nonGoals?: string;
        approach?: string;
        interfaces?: string;
        alternatives?: string;
        openQuestions?: string;
        assumptions?: string;
    };
    plan: {
        stages?: Stage[];
    };
    rollout: {
        risks?: Risk[];
        observability?: string;
        rolloutSteps?: string[];
        killSwitch?: string;
        rollback?: string;
        stopConditions?: string[];
    };
}

/** Stage definition for PLAN.md */
export interface Stage {
    id: number;
    name: string;
    deliverables: string[];
    dependencies: string[];
    acceptanceCriteria: string[];
    definitionOfDone: string;
    validationNotes: string;
}

/** Risk definition for ROLLOUT.md */
export interface Risk {
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    mitigation: string;
}

/** Document hashes for change detection */
export interface DocumentHashes {
    rfc?: string;
    plan?: string;
    rollout?: string;
}

/** Complete DocForge state */
export interface DocForgeState {
    version: number;
    project: ProjectMetadata;
    currentStep: StepId;
    checkpointResponses: CheckpointResponse[];
    approvals: Approval[];
    documentHashes: DocumentHashes;
    documentProgress: DocumentProgress;
    strictMode: boolean;
}

/** Initial state factory */
export function createInitialState(project: ProjectMetadata): DocForgeState {
    return {
        version: 1,
        project,
        currentStep: 'rfc.problem',
        checkpointResponses: [],
        approvals: [],
        documentHashes: {},
        documentProgress: {
            rfc: {},
            plan: {},
            rollout: {},
        },
        strictMode: false,
    };
}
