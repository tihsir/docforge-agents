/**
 * Mock Provider for testing
 * Returns deterministic responses without API calls
 */

import type {
    LLMProvider,
    GenerateOptions,
    GenerateResponse,
} from './types.js';

/** Mock response data for different scenarios */
const MOCK_RESPONSES = {
    rfc: {
        problem: {
            statement: 'The current system lacks proper documentation and planning infrastructure, leading to inconsistent project execution and knowledge gaps.',
            impact: 'Teams spend excessive time communicating context and resolving misunderstandings that could be prevented with better planning documents.',
        },
        goals: [
            'Provide a standardized format for project planning documents',
            'Enable collaborative document generation with AI assistance',
            'Ensure traceability between planning and implementation',
        ],
        nonGoals: [
            'Replace existing project management tools',
            'Automate code generation from documents',
            'Provide real-time collaboration features',
        ],
        approach: 'Implement a CLI-based tool that guides users through generating RFC, PLAN, and ROLLOUT documents using AI-assisted prompts with checkpoint-based review.',
        keyDecisions: [
            'Use TypeScript for type safety',
            'Adopt Commander.js for CLI framework',
            'Store state in JSON file for portability',
        ],
        interfaces: {
            api: 'CLI commands: init, continue, review, approve, prompts',
            dataFormat: 'Markdown documents with structured sections',
            stateFormat: 'JSON state file in .docforge/state.json',
        },
        alternatives: [
            {
                name: 'Web-based dashboard',
                pros: ['Real-time collaboration', 'Visual interface'],
                cons: ['More complex deployment', 'Requires server infrastructure'],
                decision: 'Rejected: MVP focuses on simplicity and local-first approach',
            },
            {
                name: 'IDE extension',
                pros: ['Integrated workflow', 'Direct file access'],
                cons: ['IDE-specific', 'More development overhead'],
                decision: 'Deferred: Can be added later as a complement to CLI',
            },
        ],
        openQuestions: [
            'Should we support custom templates?',
            'How to handle multi-user workflows?',
        ],
        assumptions: [
            'Users have access to an LLM API',
            'Projects follow a staged implementation approach',
        ],
    },
    plan: {
        stages: [
            {
                id: 0,
                name: 'Foundation',
                deliverables: ['Project scaffold', 'Core CLI structure', 'State management'],
                dependencies: [],
                acceptanceCriteria: [
                    'CLI responds to help command',
                    'State file can be created and loaded',
                ],
                definitionOfDone: 'All foundation components implemented and tested',
                validationNotes: 'Run unit tests and verify CLI help output',
            },
            {
                id: 1,
                name: 'Document Generation',
                deliverables: ['RFC generation', 'PLAN generation', 'ROLLOUT generation'],
                dependencies: ['Foundation'],
                acceptanceCriteria: [
                    'Each document type can be generated',
                    'Documents follow template structure',
                ],
                definitionOfDone: 'All document types generate valid markdown',
                validationNotes: 'Verify document structure matches template',
            },
            {
                id: 2,
                name: 'Review & Approval',
                deliverables: ['Review command', 'Approval workflow', 'Strict mode'],
                dependencies: ['Document Generation'],
                acceptanceCriteria: [
                    'Documents can be reviewed',
                    'Approvals are persisted',
                    'Strict mode validates completeness',
                ],
                definitionOfDone: 'Full approval workflow functional',
                validationNotes: 'Test approval flow end-to-end',
            },
        ],
    },
    rollout: {
        risks: [
            {
                description: 'LLM API rate limits could block document generation',
                severity: 'medium',
                mitigation: 'Implement retry logic with exponential backoff',
            },
            {
                description: 'Generated content quality may vary',
                severity: 'medium',
                mitigation: 'Checkpoint-based review allows user corrections',
            },
            {
                description: 'State file corruption could lose progress',
                severity: 'low',
                mitigation: 'Implement backup before writes',
            },
        ],
        observability: 'CLI provides progress output, error messages, and verbose mode for debugging.',
        rolloutSteps: [
            'Release as npm package',
            'Announce on project channels',
            'Gather early feedback',
            'Iterate based on user input',
        ],
        killSwitch: 'Users can delete .docforge directory to reset state.',
        rollback: 'npm uninstall docforge-agents to remove the tool.',
        stopConditions: [
            'Critical bugs affecting data integrity',
            'Security vulnerabilities discovered',
            'API breaking changes in dependencies',
        ],
    },
};

/**
 * Mock LLM provider for testing and development
 */
export class MockProvider implements LLMProvider {
    readonly name = 'mock';

    isConfigured(): boolean {
        return true;
    }

    getConfigInstructions(): string {
        return 'Mock provider requires no configuration.';
    }

    async generate(options: GenerateOptions): Promise<GenerateResponse> {
        // Simulate some latency
        await new Promise(resolve => setTimeout(resolve, 100));

        // Determine what to return based on the prompt content
        const lastMessage = options.messages[options.messages.length - 1];
        const content = lastMessage?.content?.toLowerCase() ?? '';

        let response: unknown;

        if (content.includes('generate goals') || content.includes('generate goals and non-goals')) {
            response = {
                goals: MOCK_RESPONSES.rfc.goals,
                nonGoals: MOCK_RESPONSES.rfc.nonGoals,
            };
        } else if (content.includes('generate a problem statement') || content.includes('core problem being solved')) {
            response = MOCK_RESPONSES.rfc.problem;
        } else if (content.includes('describe the high-level technical approach')) {
            response = {
                approach: MOCK_RESPONSES.rfc.approach,
                keyDecisions: MOCK_RESPONSES.rfc.keyDecisions,
            };
        } else if (content.includes('define the interfaces and contracts')) {
            response = MOCK_RESPONSES.rfc.interfaces;
        } else if (content.includes('generate: 1. at least 2 alternative approaches')) {
            response = { alternatives: MOCK_RESPONSES.rfc.alternatives };
        } else if (content.includes('analyze risks for this project rollout')) {
            response = { risks: MOCK_RESPONSES.rollout.risks };
        } else if (content.includes('define an observability plan')) {
            response = { observability: MOCK_RESPONSES.rollout.observability };
        } else if (content.includes('create rollout and rollback procedures')) {
            response = {
                rolloutSteps: MOCK_RESPONSES.rollout.rolloutSteps,
                killSwitch: MOCK_RESPONSES.rollout.killSwitch,
                rollback: MOCK_RESPONSES.rollout.rollback,
                stopConditions: MOCK_RESPONSES.rollout.stopConditions,
            };
        } else if (content.includes('create a staged implementation plan') || content.includes('review and refine the acceptance criteria')) {
            response = { stages: MOCK_RESPONSES.plan.stages };
        } else {
            // Default: return RFC data to be safe, but try to infer better defaults if possible
            if (content.includes('problem')) {
                response = MOCK_RESPONSES.rfc.problem;
            } else {
                response = MOCK_RESPONSES.rfc;
            }
        }

        return {
            content: JSON.stringify(response, null, 2),
            parsed: response,
            usage: {
                promptTokens: 100,
                completionTokens: 200,
                totalTokens: 300,
            },
        };
    }
}

/**
 * Create a mock provider instance
 */
export function createMockProvider(): LLMProvider {
    return new MockProvider();
}
