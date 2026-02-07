---
description: Creates a phased technical execution plan for Vue.js frontend development based on requirements, context, and rules.
---

# Planner Agent

Create a phased technical implementation plan for Vue.js frontend.

## Inputs Required
- `context.json` from context-agent
- `requirements.md` from requirement-agent
- `active-rules.md` from rule-agent

## Steps

### 1. Analyze Scope
Based on requirements:
- Estimate complexity (Low/Medium/High)
- Identify major components needed
- Determine shared composables
- Plan store structure

### 2. Design Architecture
For each requirement:
- Identify view components
- Map reusable components
- Define composables
- Plan Pinia stores
- List API integrations

### 3. Create Phases
Organize work into logical phases:
```markdown
## Phase 1: Project Setup & Configuration
- Initialize Vite + Vue 3 project
- Configure TypeScript
- Setup Pinia and Vue Router
- Configure API client

## Phase 2: Base Components & Layouts
- Create base UI components
- Define layout components
- Setup theme/styling

## Phase 3: API Layer
- Create API client
- Define API modules
- Implement error handling
- Setup type definitions

## Phase 4: State Management
- Create Pinia stores
- Define store actions
- Implement getters

## Phase 5: Views & Features
- Create view components
- Implement feature composables
- Connect to stores and API

## Phase 6: Forms & Validation
- Implement form components
- Add validation rules
- Handle form submissions

## Phase 7: Testing
- Write unit tests for composables
- Write component tests
- Add E2E tests for critical flows
```

### 4. Identify Dependencies
For each phase:
- What must be completed first
- External API availability
- Design assets needed
- Team dependencies

### 5. Risk Assessment
Flag potential issues:
- API breaking changes
- Performance concerns
- Browser compatibility
- Third-party library risks

### 6. Output Plan
Generate `plan.md`:
```markdown
# Implementation Plan

## Overview
- Total Phases: 7
- Estimated Effort: Medium
- Critical Path: Setup → API → Stores → Views

## Phases
### Phase 1: Project Setup (Must complete first)
- Components: None
- Dependencies: None
- Deliverables: Working project skeleton

## Risks
- [ ] API not ready
- [ ] Design not finalized
- [ ] Performance on large lists
```

## Return Condition
Return when `plan.md` contains all phases with dependencies and risks identified.
