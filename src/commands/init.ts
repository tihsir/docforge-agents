/**
 * init command
 * Initialize a new DocForge project
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import { projectExists, initializeProject } from '../state/store.js';
import { ensureDir, getDocsDir, getPromptsDir } from '../utils/files.js';
import * as console from '../utils/console.js';
import type { ProjectMetadata } from '../state/types.js';

export const initCommand = new Command('init')
    .description('Initialize a new DocForge project')
    .option('--name <name>', 'Project name')
    .option('--stack <stack>', 'Comma-separated list of technologies')
    .option('--strict', 'Enable strict mode (blocks approval if sections missing)')
    .action(async (options) => {
        console.header('DocForge Agents - Initialize Project');

        // Check if project already exists
        if (await projectExists()) {
            console.error('A DocForge project already exists in this directory.');
            console.info('Use "docforge continue" to resume work.');
            process.exit(1);
        }

        // Gather project information
        let projectName = options.name;
        let stack: string[] = options.stack ? options.stack.split(',').map((s: string) => s.trim()) : [];
        let constraints: string[] = [];

        if (!projectName || stack.length === 0) {
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'name',
                    message: 'Project name:',
                    default: process.cwd().split(/[\\/]/).pop(),
                    when: !projectName,
                },
                {
                    type: 'input',
                    name: 'stack',
                    message: 'Technology stack (comma-separated):',
                    default: 'TypeScript, Node.js',
                    when: stack.length === 0,
                },
                {
                    type: 'input',
                    name: 'constraints',
                    message: 'Constraints (comma-separated, e.g., "no external deps, must work offline"):',
                    default: '',
                },
            ]);

            if (answers.name) projectName = answers.name;
            if (answers.stack) {
                stack = answers.stack.split(',').map((s: string) => s.trim());
            }
            if (answers.constraints) {
                constraints = answers.constraints.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
        }

        // Create project metadata
        const project: ProjectMetadata = {
            name: projectName,
            stack,
            constraints,
            createdAt: new Date().toISOString(),
        };

        // Initialize project
        console.info('Creating DocForge project...');

        const state = await initializeProject(project);

        // Create output directories
        await ensureDir(getDocsDir());
        await ensureDir(getPromptsDir());

        // Apply strict mode if requested
        if (options.strict) {
            state.strictMode = true;
            const { saveState } = await import('../state/store.js');
            await saveState(state);
        }

        console.success('Project initialized!');
        console.blank();
        console.section('Project Details');
        console.info(`Name: ${project.name}`);
        console.info(`Stack: ${project.stack.join(', ')}`);
        console.info(`Constraints: ${project.constraints.join(', ') || 'None'}`);
        console.info(`Strict Mode: ${state.strictMode ? 'Enabled' : 'Disabled'}`);
        console.blank();
        console.section('Next Steps');
        console.info('Run "docforge continue" to start generating documents.');
    });
