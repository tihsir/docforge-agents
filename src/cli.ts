#!/usr/bin/env node

/**
 * DocForge Agents CLI
 * Main entry point for the CLI application
 */

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { continueCommand } from './commands/continue.js';
import { reviewCommand } from './commands/review.js';
import { approveCommand } from './commands/approve.js';
import { promptsCommand } from './commands/prompts.js';

const program = new Command();

program
    .name('docforge')
    .description('AI-assisted CLI for generating senior-level planning artifacts')
    .version('0.1.0');

// Register commands
program.addCommand(initCommand);
program.addCommand(continueCommand);
program.addCommand(reviewCommand);
program.addCommand(approveCommand);
program.addCommand(promptsCommand);

// Parse arguments and execute
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
