---
description: Aggregates global, project, and frontend-specific rules into enforceable constraints for Vue.js planning and task generation.
---

# Rule Agent

Aggregate applicable rules for Vue.js frontend development.

## Steps

### 1. Collect Global Rules
Read from:
- Global `.cursorrules`

### 2. Collect Project Rules
Read from:
- `.cursor/rules/project.md`
- Project-level `.cursorrules`

### 3. Collect Frontend Rules
Read from:
- `.cursor/rules/frontend.md`

### 4. Collect Core Rules
Read from:
- `.cursor/rules/base.md`

### 5. Merge and Prioritize
Priority order (highest to lowest):
1. Project-specific overrides
2. Frontend rules
3. Core rules
4. Global rules

### 6. Output Active Rules
Generate `active-rules.md`:
```markdown
# Active Rules for This Task

## Vue 3 Rules
- Composition API with <script setup>
- TypeScript required
- Max 300 lines per component

## State Management (Pinia)
- Setup store syntax
- Typed state and getters
- Actions for all mutations

## Vue Router
- Lazy loading all routes
- Named routes for navigation
- Auth in navigation guards

## TypeScript
- Strict mode enabled
- No `any` types
- Interfaces for entities

## API Integration
- Centralized API client
- Typed request/response
- Error interceptors

## Security
- No v-html with user input
- Secure token storage
- Input validation

## Testing
- 70% coverage minimum
- Unit tests for composables
- Component tests for logic

## Clean Code
- Self-explanatory naming
- Max 20 lines per function
- No magic numbers
```

## Return Condition
Return when `active-rules.md` contains all applicable rules merged and prioritized.
