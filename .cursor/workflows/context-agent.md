---
description: Collects and structures technical, architectural, and organizational context of the Vue.js project to constrain planning and task generation.
---

# Context Agent

Collect comprehensive Vue.js project context for downstream agents.

## Steps

### 1. Analyze Project Structure
Scan the project directory to identify:
- Vue.js version (Vue 3)
- TypeScript configuration
- Build tool (Vite)
- Module structure

### 2. Identify Architecture
Determine the architectural pattern:
- Component organization
- Composables structure
- Store modules
- API layer organization

### 3. Extract Technology Stack
Document:
- Vue version
- Pinia version
- Vue Router version
- UI framework (if any)
- Testing framework

### 4. Find Existing Rules
Look for:
- `.cursor/rules/*.md`
- `.cursorrules`
- ESLint/Prettier configurations

### 5. Analyze Dependencies
Review `package.json`:
- Key libraries
- Dev dependencies
- Script configurations

### 6. Output Context
Generate a structured `context.json`:
```json
{
  "project": {
    "name": "project-name",
    "framework": "Vue 3",
    "language": "TypeScript",
    "buildTool": "Vite"
  },
  "architecture": {
    "pattern": "Component-Based",
    "stateManagement": "Pinia",
    "routing": "Vue Router",
    "featureModules": ["auth", "users", "dashboard"]
  },
  "dependencies": {
    "ui": "PrimeVue | Vuetify | None",
    "http": "Axios",
    "validation": "Vuelidate | VeeValidate | None"
  },
  "testing": {
    "unit": "Vitest",
    "component": "@vue/test-utils",
    "e2e": "Cypress | Playwright | None"
  },
  "rules": {
    "project": [".cursor/rules/project.md"]
  }
}
```

## Return Condition
Return when `context.json` is generated with all sections populated.
