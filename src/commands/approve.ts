/**
 * approve command
 * Approve documents for production
 */

import { Command } from 'commander';
import { loadState, recordApproval, isDocumentApproved } from '../state/store.js';
import { renderRfc } from '../templates/rfc.js';
import { renderPlan } from '../templates/plan.js';
import { renderRollout } from '../templates/rollout.js';
import { validateDocumentByType, strictModeCheck } from '../utils/validation.js';
import { writeFileSafe, getDocPath } from '../utils/files.js';
import { getProvider, isProviderAvailable } from '../providers/factory.js';
import { CriticAgent } from '../agents/critic.js';
import * as console from '../utils/console.js';
import type { DocForgeState } from '../state/types.js';

export const approveCommand = new Command('approve')
    .description('Approve documents')
    .argument('<document>', 'Document to approve (rfc, plan, rollout, or all)')
    .option('--skip-critic', 'Skip consistency checks')
    .option('--force', 'Force approval even if validation fails')
    .action(async (document, options) => {
        console.header('DocForge Agents - Approve');

        // Load state
        let state: DocForgeState;
        try {
            state = await loadState();
        } catch (error) {
            console.error('No DocForge project found. Run "docforge init" first.');
            process.exit(1);
        }

        // Determine which documents to approve
        const docsToApprove: ('rfc' | 'plan' | 'rollout')[] =
            document === 'all' ? ['rfc', 'plan', 'rollout'] : [document];

        // Validate document argument
        for (const doc of docsToApprove) {
            if (!['rfc', 'plan', 'rollout'].includes(doc)) {
                console.error(`Unknown document: ${doc}`);
                console.info('Valid options: rfc, plan, rollout, all');
                process.exit(1);
            }
        }

        // Run critic check if enabled and provider available
        if (!options.skipCritic && isProviderAvailable()) {
            try {
                console.info('Running consistency checks...');
                const provider = getProvider();
                const critic = new CriticAgent(provider);
                const review = await critic.reviewAll(state);

                if (!review.passed) {
                    console.warning('Consistency issues found:');
                    for (const issue of review.issues) {
                        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
                        console.info(`  ${icon} [${issue.location}] ${issue.description}`);
                    }
                    console.blank();

                    if (!options.force) {
                        console.error('Approval blocked due to consistency issues.');
                        console.info('Use --force to approve anyway, or --skip-critic to skip checks.');
                        process.exit(1);
                    }
                } else {
                    console.success('Consistency checks passed.');
                }
            } catch (error) {
                console.warning(`Could not run critic: ${(error as Error).message}`);
            }
        }

        // Approve each document
        for (const docType of docsToApprove) {
            await approveDocument(state, docType, options.force);
        }

        console.blank();
        console.success('Approval complete!');

        // Check if all approved
        const allApproved = ['rfc', 'plan', 'rollout'].every(d =>
            isDocumentApproved(state, d as 'rfc' | 'plan' | 'rollout')
        );

        if (allApproved) {
            console.info('All documents approved. Run "docforge prompts" to generate stage prompts.');
        }
    });

/**
 * Approve a single document
 */
async function approveDocument(
    state: DocForgeState,
    docType: 'rfc' | 'plan' | 'rollout',
    force: boolean
): Promise<void> {
    console.section(`Approving ${docType.toUpperCase()}.md`);

    // Get document content
    let content: string;
    switch (docType) {
        case 'rfc':
            content = renderRfc(state);
            break;
        case 'plan':
            content = renderPlan(state);
            break;
        case 'rollout':
            content = renderRollout(state);
            break;
    }

    // Check if document is generated
    if (!content || content.trim().length < 50) {
        console.warning(`${docType.toUpperCase()}.md not yet generated. Skipping.`);
        return;
    }

    // Validate document structure
    const validation = validateDocumentByType(docType, content);
    if (!validation.valid) {
        console.warning('Missing required sections:');
        validation.missingSections.forEach(s => console.info(`  - ${s}`));

        // Check strict mode
        const strictCheck = strictModeCheck(state, docType, content);
        if (!strictCheck.passes && !force) {
            console.error('Strict mode: Cannot approve document with missing sections.');
            console.info('Use --force to approve anyway.');
            return;
        }
    }

    // Show warnings
    if (validation.warnings.length > 0) {
        validation.warnings.forEach(w => console.warning(w));
    }

    // Save document to disk
    await writeFileSafe(getDocPath(docType), content);
    console.success(`Saved: docs/${docType.toUpperCase()}.md`);

    // Record approval
    await recordApproval(docType, content);
    console.success(`Approved: ${docType.toUpperCase()}.md`);
}
