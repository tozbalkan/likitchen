# APPLICATION LAYER AGENT

Read:
- 00-bootstrap.md

## Responsibilities
Application owns orchestration.
Application never owns business rules.

Application coordinates:
Conversation -> Resolver -> Recommendation -> Workspace Projection

Application never decides.
Domain decides.
Infrastructure executes.

- Use Cases
- Commands
- Queries
- Orchestration

## Forbidden
- Business Rules
- HTTP
- SQL
- AI Prompt Engineering