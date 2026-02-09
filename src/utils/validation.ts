/**
 * Document validation utilities
 */

import type { DocForgeState } from '../state/types.js';

/** Section requirements for strict mode validation */
interface SectionRequirement {
    name: string;
    required: boolean;
    pattern: RegExp;
}

/** RFC required sections */
const RFC_SECTIONS: SectionRequirement[] = [
    { name: 'Problem Statement', required: true, pattern: /^##\s*Problem/mi },
    { name: 'Goals', required: true, pattern: /^##\s*Goals/mi },
    { name: 'Non-Goals', required: true, pattern: /^##\s*Non-Goals/mi },
    { name: 'Approach', required: true, pattern: /^##\s*(?:Proposed\s+)?Approach/mi },
    { name: 'Interfaces & Contracts', required: true, pattern: /^##\s*Interfaces/mi },
    { name: 'Alternatives', required: true, pattern: /^##\s*Alternatives/mi },
    { name: 'Open Questions', required: false, pattern: /^##\s*Open\s*Questions/mi },
    { name: 'Assumptions', required: false, pattern: /^##\s*Assumptions/mi },
];

/** Plan required sections */
const PLAN_SECTIONS: SectionRequirement[] = [
    { name: 'Overview', required: true, pattern: /^##\s*Overview/mi },
    { name: 'Stages', required: true, pattern: /^##\s*Stage\s*\d+/mi },
    { name: 'Acceptance Criteria', required: true, pattern: /acceptance\s*criteria/mi },
    { name: 'Definition of Done', required: true, pattern: /definition\s*of\s*done/mi },
];

/** Rollout required sections */
const ROLLOUT_SECTIONS: SectionRequirement[] = [
    { name: 'Key Risks', required: true, pattern: /^##\s*(?:Key\s*)?Risks/mi },
    { name: 'Observability', required: true, pattern: /^##\s*Observability/mi },
    { name: 'Rollout Steps', required: true, pattern: /^##\s*Rollout/mi },
    { name: 'Kill Switch', required: true, pattern: /kill\s*switch/mi },
    { name: 'Rollback', required: true, pattern: /^##\s*Rollback/mi },
    { name: 'Stop Conditions', required: true, pattern: /stop.*condition/mi },
];

/** Validation result */
export interface ValidationResult {
    valid: boolean;
    missingSections: string[];
    warnings: string[];
}

/**
 * Validate a document against its requirements
 */
function validateDocument(
    content: string,
    sections: SectionRequirement[]
): ValidationResult {
    const missingSections: string[] = [];
    const warnings: string[] = [];

    for (const section of sections) {
        if (!section.pattern.test(content)) {
            if (section.required) {
                missingSections.push(section.name);
            } else {
                warnings.push(`Optional section missing: ${section.name}`);
            }
        }
    }

    return {
        valid: missingSections.length === 0,
        missingSections,
        warnings,
    };
}

/**
 * Validate RFC document
 */
export function validateRfc(content: string): ValidationResult {
    return validateDocument(content, RFC_SECTIONS);
}

/**
 * Validate Plan document
 */
export function validatePlan(content: string): ValidationResult {
    return validateDocument(content, PLAN_SECTIONS);
}

/**
 * Validate Rollout document
 */
export function validateRollout(content: string): ValidationResult {
    return validateDocument(content, ROLLOUT_SECTIONS);
}

/**
 * Validate a document by type
 */
export function validateDocumentByType(
    documentType: 'rfc' | 'plan' | 'rollout',
    content: string
): ValidationResult {
    switch (documentType) {
        case 'rfc':
            return validateRfc(content);
        case 'plan':
            return validatePlan(content);
        case 'rollout':
            return validateRollout(content);
    }
}

/**
 * Check if strict mode validation passes
 */
export function strictModeCheck(
    state: DocForgeState,
    documentType: 'rfc' | 'plan' | 'rollout',
    content: string
): { passes: boolean; errors: string[] } {
    if (!state.strictMode) {
        return { passes: true, errors: [] };
    }

    const result = validateDocumentByType(documentType, content);

    if (!result.valid) {
        return {
            passes: false,
            errors: result.missingSections.map(s => `Missing required section: ${s}`),
        };
    }

    return { passes: true, errors: [] };
}
