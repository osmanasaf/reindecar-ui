---
description: Validates Vue.js implementation plans and tasks against requirements and rules, ensuring completeness and consistency.
---

# Validation Agent

Validate plans and tasks for Vue.js frontend implementation.

## Inputs Required
- `requirements.md` from requirement-agent
- `plan.md` from planner-agent
- `tasks.md` from task-generator-agent
- `active-rules.md` from rule-agent

## Validation Checks

### 1. Requirement Coverage
For each requirement:
- [ ] Has corresponding task(s)
- [ ] Acceptance criteria mapped
- [ ] Testing task exists

```markdown
## Requirement Coverage Matrix

| Requirement | Tasks | Coverage |
|-------------|-------|----------|
| FR-001: User Login | TASK-005, TASK-006 | ✅ Complete |
| FR-002: Dashboard | TASK-010 | ⚠️ Missing tests |
| NFR-001: Performance | Not addressed | ❌ Missing |
```

### 2. Rule Compliance
Verify tasks follow:
- [ ] Vue 3 Composition API pattern
- [ ] TypeScript requirements
- [ ] Component size limits
- [ ] Testing coverage requirements
- [ ] Security guidelines

### 3. Dependency Validation
- [ ] No circular dependencies
- [ ] All dependencies exist
- [ ] Execution order is feasible
- [ ] Parallel tasks don't conflict

### 4. Consistency Checks
- [ ] File naming conventions
- [ ] Component naming patterns
- [ ] Store naming patterns
- [ ] API endpoint naming

### 5. Completeness Check
- [ ] All views have components
- [ ] All forms have validation
- [ ] Error states defined
- [ ] Loading states defined
- [ ] Empty states defined

### 6. Output Report
Generate `validation-report.md`:
```markdown
# Validation Report

## Summary
- Status: PASSED | PASSED_WITH_WARNINGS | FAILED
- Checks: 25/25 passed
- Warnings: 3
- Errors: 0

## Requirement Coverage
- Covered: 8/10 (80%)
- Partially covered: 2
- Missing: 0

## Rule Compliance
- Violations: 0
- Warnings: 2
  - TASK-015: Component may exceed 300 lines
  - TASK-018: Consider extracting composable

## Dependency Analysis
- Circular dependencies: None
- Missing dependencies: None
- Estimated critical path: 5 tasks

## Recommendations
1. Add unit tests for TASK-012
2. Consider lazy loading for Dashboard route
3. Add error boundary component

## Ready for Implementation
[x] All requirements covered
[x] All rules applied
[x] Dependencies mapped
[ ] One warning to address
```

## Return Condition
Return when `validation-report.md` is generated with all checks completed.
