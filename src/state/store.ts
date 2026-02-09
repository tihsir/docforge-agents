/**
 * State store for persisting DocForge state to .docforge/state.json
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { DocForgeState, createInitialState, ProjectMetadata } from './types.js';
import { calculateHash } from '../utils/hash.js';

const STATE_DIR = '.docforge';
const STATE_FILE = 'state.json';

/**
 * Get the path to the state directory
 */
export function getStateDirPath(cwd: string = process.cwd()): string {
    return join(cwd, STATE_DIR);
}

/**
 * Get the path to the state file
 */
export function getStateFilePath(cwd: string = process.cwd()): string {
    return join(getStateDirPath(cwd), STATE_FILE);
}

/**
 * Check if a DocForge project exists in the current directory
 */
export async function projectExists(cwd: string = process.cwd()): Promise<boolean> {
    try {
        await access(getStateFilePath(cwd));
        return true;
    } catch {
        return false;
    }
}

/**
 * Initialize a new DocForge project
 */
export async function initializeProject(
    project: ProjectMetadata,
    cwd: string = process.cwd()
): Promise<DocForgeState> {
    const stateDir = getStateDirPath(cwd);
    const statePath = getStateFilePath(cwd);

    // Create .docforge directory
    await mkdir(stateDir, { recursive: true });

    // Create initial state
    const state = createInitialState(project);

    // Write state file
    await writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');

    return state;
}

/**
 * Load state from disk
 */
export async function loadState(cwd: string = process.cwd()): Promise<DocForgeState> {
    const statePath = getStateFilePath(cwd);

    try {
        const content = await readFile(statePath, 'utf-8');
        return JSON.parse(content) as DocForgeState;
    } catch (error) {
        throw new Error(
            'No DocForge project found. Run "docforge init" to create one.'
        );
    }
}

/**
 * Save state to disk
 */
export async function saveState(
    state: DocForgeState,
    cwd: string = process.cwd()
): Promise<void> {
    const statePath = getStateFilePath(cwd);
    await writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Update state with a partial update
 */
export async function updateState(
    updates: Partial<DocForgeState>,
    cwd: string = process.cwd()
): Promise<DocForgeState> {
    const state = await loadState(cwd);
    const newState = { ...state, ...updates };
    await saveState(newState, cwd);
    return newState;
}

/**
 * Record a checkpoint response
 */
export async function recordCheckpointResponse(
    stepId: string,
    disagreements: string | null,
    clarifications: string | null,
    missedConstraints: string | null,
    cwd: string = process.cwd()
): Promise<DocForgeState> {
    const state = await loadState(cwd);

    const response = {
        stepId,
        disagreements,
        clarifications,
        missedConstraints,
        respondedAt: new Date().toISOString(),
    };

    state.checkpointResponses.push(response);
    await saveState(state, cwd);
    return state;
}

/**
 * Record a document approval
 */
export async function recordApproval(
    documentType: 'rfc' | 'plan' | 'rollout',
    content: string,
    cwd: string = process.cwd()
): Promise<DocForgeState> {
    const state = await loadState(cwd);
    const contentHash = calculateHash(content);

    // Remove any existing approval for this document type
    state.approvals = state.approvals.filter(a => a.documentType !== documentType);

    // Add new approval
    state.approvals.push({
        documentType,
        contentHash,
        approvedAt: new Date().toISOString(),
    });

    // Update document hash
    state.documentHashes[documentType] = contentHash;

    await saveState(state, cwd);
    return state;
}

/**
 * Check if a document is approved
 */
export function isDocumentApproved(
    state: DocForgeState,
    documentType: 'rfc' | 'plan' | 'rollout'
): boolean {
    return state.approvals.some(a => a.documentType === documentType);
}

/**
 * Check if a document has changed since approval
 */
export function hasDocumentChanged(
    state: DocForgeState,
    documentType: 'rfc' | 'plan' | 'rollout',
    currentContent: string
): boolean {
    const approval = state.approvals.find(a => a.documentType === documentType);
    if (!approval) return true;

    const currentHash = calculateHash(currentContent);
    return approval.contentHash !== currentHash;
}

/**
 * Check if all required documents are approved
 */
export function areAllDocumentsApproved(state: DocForgeState): boolean {
    const required: ('rfc' | 'plan' | 'rollout')[] = ['rfc', 'plan', 'rollout'];
    return required.every(doc => isDocumentApproved(state, doc));
}
