/**
 * State transitions unit tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import {
    initializeProject,
    loadState,
    saveState,
    projectExists,
    recordApproval,
    isDocumentApproved,
    areAllDocumentsApproved,
} from '../src/state/store.js';
import {
    getStep,
    getNextStep,
    isCheckpoint,
    getPhase,
    advanceStep,
    isPhaseComplete,
} from '../src/state/machine.js';
import type { ProjectMetadata, DocForgeState } from '../src/state/types.js';

const TEST_DIR = join(process.cwd(), 'test-workspace');

describe('State Store', () => {
    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should detect no project exists initially', async () => {
        const exists = await projectExists(TEST_DIR);
        expect(exists).toBe(false);
    });

    it('should initialize a new project', async () => {
        const project: ProjectMetadata = {
            name: 'Test Project',
            stack: ['TypeScript', 'Node.js'],
            constraints: ['No external deps'],
            createdAt: new Date().toISOString(),
        };

        const state = await initializeProject(project, TEST_DIR);

        expect(state.project.name).toBe('Test Project');
        expect(state.currentStep).toBe('rfc.problem');
        expect(state.approvals).toHaveLength(0);
    });

    it('should detect project exists after init', async () => {
        const project: ProjectMetadata = {
            name: 'Test',
            stack: ['TypeScript'],
            constraints: [],
            createdAt: new Date().toISOString(),
        };

        await initializeProject(project, TEST_DIR);
        const exists = await projectExists(TEST_DIR);

        expect(exists).toBe(true);
    });

    it('should load and save state', async () => {
        const project: ProjectMetadata = {
            name: 'Test',
            stack: ['TypeScript'],
            constraints: [],
            createdAt: new Date().toISOString(),
        };

        const initial = await initializeProject(project, TEST_DIR);
        initial.currentStep = 'rfc.goals';
        await saveState(initial, TEST_DIR);

        const loaded = await loadState(TEST_DIR);
        expect(loaded.currentStep).toBe('rfc.goals');
    });

    it('should record approvals correctly', async () => {
        const project: ProjectMetadata = {
            name: 'Test',
            stack: ['TypeScript'],
            constraints: [],
            createdAt: new Date().toISOString(),
        };

        await initializeProject(project, TEST_DIR);
        await recordApproval('rfc', '# Test RFC Content', TEST_DIR);

        const state = await loadState(TEST_DIR);
        expect(isDocumentApproved(state, 'rfc')).toBe(true);
        expect(isDocumentApproved(state, 'plan')).toBe(false);
    });

    it('should check all documents approved', async () => {
        const project: ProjectMetadata = {
            name: 'Test',
            stack: ['TypeScript'],
            constraints: [],
            createdAt: new Date().toISOString(),
        };

        await initializeProject(project, TEST_DIR);

        let state = await loadState(TEST_DIR);
        expect(areAllDocumentsApproved(state)).toBe(false);

        await recordApproval('rfc', 'RFC content', TEST_DIR);
        await recordApproval('plan', 'Plan content', TEST_DIR);
        await recordApproval('rollout', 'Rollout content', TEST_DIR);

        state = await loadState(TEST_DIR);
        expect(areAllDocumentsApproved(state)).toBe(true);
    });
});

describe('State Machine', () => {
    it('should get correct step definitions', () => {
        const step = getStep('rfc.problem');
        expect(step.phase).toBe('rfc');
        expect(step.isCheckpoint).toBe(true);
        expect(step.next).toBe('rfc.goals');
    });

    it('should return next step correctly', () => {
        expect(getNextStep('rfc.problem')).toBe('rfc.goals');
        expect(getNextStep('rfc.goals')).toBe('rfc.approach');
        expect(getNextStep('rfc.complete')).toBe('plan.stages');
        expect(getNextStep('complete')).toBeNull();
    });

    it('should identify checkpoints correctly', () => {
        expect(isCheckpoint('rfc.problem')).toBe(true);
        expect(isCheckpoint('rfc.goals')).toBe(true);
        expect(isCheckpoint('rfc.complete')).toBe(false);
        expect(isCheckpoint('plan.stages')).toBe(true);
    });

    it('should get phase correctly', () => {
        expect(getPhase('rfc.problem')).toBe('rfc');
        expect(getPhase('plan.stages')).toBe('plan');
        expect(getPhase('rollout.risks')).toBe('rollout');
        expect(getPhase('prompts.generate')).toBe('prompts');
    });

    it('should detect phase completion', () => {
        const state: DocForgeState = {
            version: 1,
            project: {
                name: 'Test',
                stack: [],
                constraints: [],
                createdAt: '',
            },
            currentStep: 'plan.stages',
            checkpointResponses: [],
            approvals: [],
            documentHashes: {},
            documentProgress: { rfc: {}, plan: {}, rollout: {} },
            strictMode: false,
        };

        expect(isPhaseComplete(state, 'rfc')).toBe(true);
        expect(isPhaseComplete(state, 'plan')).toBe(false);
        expect(isPhaseComplete(state, 'rollout')).toBe(false);
    });
});
