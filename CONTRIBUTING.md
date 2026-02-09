# Contributing to DocForge Agents

Thank you for your interest in contributing to DocForge Agents!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/docforge-agents.git
cd docforge-agents

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## Project Structure

```
src/
├── cli.ts           # CLI entry point
├── commands/        # CLI command implementations
├── agents/          # Document generation agents
├── providers/       # LLM provider abstraction
├── state/           # State management
├── templates/       # Document templates
└── utils/           # Utilities
```

## Development Workflow

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following the code style
3. **Add tests** for new functionality
4. **Run the test suite** to ensure nothing is broken
5. **Submit a pull request**

## Code Style

- Use TypeScript strict mode
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Keep functions focused and small

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- state.test.ts
```

## Adding a New Provider

1. Create a new file in `src/providers/`
2. Implement the `LLMProvider` interface from `types.ts`
3. Export a factory function
4. Register in `factory.ts`
5. Add tests
6. Update README

## Adding a New Agent

1. Create a new file in `src/agents/`
2. Extend `BaseAgent` class
3. Implement `generateStep` method
4. Add to workflow in `machine.ts` if needed
5. Add tests

## Commit Messages

Use clear, descriptive commit messages:

- `feat: add new provider for Anthropic`
- `fix: handle empty state file gracefully`
- `docs: update README with new command`
- `test: add integration tests for approval flow`

## Reporting Issues

When reporting issues, please include:

- Your Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Any relevant error messages

## Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Request review from maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
