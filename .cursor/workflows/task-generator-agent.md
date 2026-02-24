---
description: Breaks planning phases into concrete, dependency-aware technical tasks for Vue.js frontend implementation.
---

# Task Generator Agent

Generate implementation tasks from the Vue.js project plan.

## Inputs Required
- `plan.md` from planner-agent
- `active-rules.md` from rule-agent

## Steps

### 1. Parse Plan Phases
For each phase in the plan:
- Extract components to create
- Identify dependencies
- Note constraints from rules

### 2. Generate Tasks

#### Task Template
```markdown
## TASK-001: [Task Title]

**Phase**: Phase 1
**Priority**: High | Medium | Low
**Estimated**: 2h

### Description
Clear description of what to implement.

### Deliverables
- [ ] `ComponentName.vue` created
- [ ] Types defined in `types/`
- [ ] Unit tests written
- [ ] Integration tested

### Technical Details
- Component location: `src/components/`
- Props: `{ title: string, items: Item[] }`
- Events: `@select`, `@delete`

### Dependencies
- Requires: TASK-000
- Blocks: TASK-002

### Acceptance Criteria
- [ ] Renders correctly with provided data
- [ ] Handles empty state
- [ ] Emits events on user interaction
- [ ] Passes TypeScript strict mode
```

### 3. Task Categories

#### Setup Tasks
- Project initialization
- Configuration files
- Development tooling

#### Component Tasks
- View components
- UI components
- Layout components

#### Logic Tasks
- Composables
- Utility functions
- Type definitions

#### State Tasks
- Pinia store creation
- Store actions/getters
- Store testing

#### API Tasks
- API client setup
- Endpoint implementations
- Error handling

#### Testing Tasks
- Unit test writing
- Component test writing
- E2E test scenarios

### 4. Define Dependencies
Map task relationships:
- Sequential dependencies
- Parallel work opportunities
- External blockers

### 5. Output Tasks
Generate `tasks.md`:
```markdown
# Implementation Tasks

## Summary
- Total Tasks: 25
- Setup: 4
- Components: 10
- Logic: 5
- Testing: 6

## Priority Matrix
### P0 - Critical Path
- TASK-001: Project Setup
- TASK-002: API Client

### P1 - Important
- TASK-005: Auth Store
- TASK-006: Login View

### P2 - Normal
- TASK-010: Profile Component

## Task Details
[All tasks with full details]
```

## Return Condition
Return when `tasks.md` contains all tasks with dependencies and acceptance criteria.
