/**
 * review command
 * Display current document status and content
 */

import { Command } from 'commander';
import { loadState, isDocumentApproved, hasDocumentChanged } from '../state/store.js';
import { getProgressPercentage, getStepLabel } from '../state/machine.js';
import { renderRfc } from '../templates/rfc.js';
import { renderPlan } from '../templates/plan.js';
import { renderRollout } from '../templates/rollout.js';
import { readFileSafe, getDocPath } from '../utils/files.js';
import * as console from '../utils/console.js';
import type { DocForgeState } from '../state/types.js';

export const reviewCommand = new Command('review')
    .description('Review current document status and content')
    .argument('[document]', 'Document to review (rfc, plan, rollout, or all)', 'all')
    .option('--diff', 'Show what changed since last approval')
    .action(async (document, options) => {
        console.header('DocForge Agents - Review');

        // Load state
        let state: DocForgeState;
        try {
            state = await loadState();
        } catch (error) {
            console.error('No DocForge project found. Run "docforge init" first.');
            process.exit(1);
        }

        // Show project status
        console.section('Project Status');
        console.info(`Project: ${state.project.name}`);
        console.info(`Current Step: ${getStepLabel(state.currentStep)}`);
        console.info(`Progress: ${getProgressPercentage(state)}%`);
        console.info(`Strict Mode: ${state.strictMode ? 'Enabled' : 'Disabled'}`);
        console.blank();

        // Show document status
        console.section('Document Status');
        showDocumentStatus(state, 'rfc', 'RFC.md');
        showDocumentStatus(state, 'plan', 'PLAN.md');
        showDocumentStatus(state, 'rollout', 'ROLLOUT.md');
        console.blank();

        // Show document content
        const docs = document === 'all' ? ['rfc', 'plan', 'rollout'] : [document];

        for (const doc of docs) {
            if (!['rfc', 'plan', 'rollout'].includes(doc)) {
                console.warning(`Unknown document: ${doc}`);
                continue;
            }

            await showDocument(state, doc as 'rfc' | 'plan' | 'rollout', options.diff);
        }
    });

/**
 * Show document approval status
 */
function showDocumentStatus(
    state: DocForgeState,
    docType: 'rfc' | 'plan' | 'rollout',
    filename: string
): void {
    const approved = isDocumentApproved(state, docType);
    const approval = state.approvals.find(a => a.documentType === docType);

    if (approved && approval) {
        const date = new Date(approval.approvedAt).toLocaleString();
        console.documentStatus(filename, true, approval.contentHash);
        console.info(`    Approved at: ${date}`);
    } else {
        console.documentStatus(filename, false);
    }
}

/**
 * Show document content
 */
async function showDocument(
    state: DocForgeState,
    docType: 'rfc' | 'plan' | 'rollout',
    showDiff: boolean
): Promise<void> {
    console.section(`${docType.toUpperCase()}.md`);

    // Get current content from state
    let currentContent: string;
    switch (docType) {
        case 'rfc':
            currentContent = renderRfc(state);
            break;
        case 'plan':
            currentContent = renderPlan(state);
            break;
        case 'rollout':
            currentContent = renderRollout(state);
            break;
    }

    if (!currentContent || currentContent.trim().length < 50) {
        console.info('Document not yet generated.');
        return;
    }

    // Get saved content from disk
    const savedContent = await readFileSafe(getDocPath(docType));

    if (showDiff && savedContent) {
        // Check if changed
        if (hasDocumentChanged(state, docType, currentContent)) {
            console.warning('Document has changed since last approval:');
        } else {
            console.success('Document unchanged since approval.');
        }
    }

    // Show content (truncated for overview)
    const lines = currentContent.split('\n');
    const preview = lines.slice(0, 30).join('\n');
    console.content('Preview', preview);

    if (lines.length > 30) {
        console.info(`... (${lines.length - 30} more lines)`);
        console.info(`View full document: docs/${docType.toUpperCase()}.md`);
    }
}
