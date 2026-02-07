---
description: Unified code review with configurable specialized reviewers for Vue.js frontend code (Vue, TypeScript, Security, Performance, Accessibility).
---

# Review Agent

Perform comprehensive Vue.js code review with multiple perspectives.

## Parameters
- `--file <path>`: Specific file to review
- `--scope <file|component|module>`: Review scope
- `--reviewers <all|vue,typescript,security,performance,accessibility>`
- `--severity <error|warning|info>`: Minimum severity to report

## Reviewers

### Vue Reviewer
Checks for:
- **Composition API**: Proper use of `<script setup>`
- **Reactivity**: Correct ref/reactive usage
- **Props/Emits**: Properly typed and documented
- **Template**: Clean expressions, proper v-if/v-for
- **Component Size**: Under 300 lines

### TypeScript Reviewer
Checks for:
- `any` type usage
- Missing type definitions
- Improper type assertions
- Generic types where needed
- Interface vs type consistency

### Pinia Reviewer
Checks for:
- Store structure patterns
- State mutation outside actions
- Missing getters for derived state
- Store-to-store dependencies
- Proper typing

### Security Reviewer
Checks for:
- `v-html` with user input
- Hardcoded credentials
- PII in console.log
- Missing input validation
- Insecure localStorage usage

### Performance Reviewer
Checks for:
- Missing `key` in v-for
- Unnecessary re-renders
- Large computed properties
- Missing lazy loading
- Bundle size concerns

### Accessibility Reviewer
Checks for:
- Missing ARIA labels
- Keyboard navigation
- Color contrast issues
- Focus management
- Screen reader support

## Output Format
```markdown
# Code Review Report

## Summary
- Files Reviewed: 5
- Issues Found: 12
- Critical: 2, Warning: 7, Info: 3

## Issues

### [CRITICAL] Vue/Reactivity
**File**: `UserForm.vue:45`
**Issue**: Destructuring reactive props loses reactivity
**Suggestion**: Use `toRefs(props)` or access via `props.user`

### [WARNING] TypeScript
**File**: `api/users.ts:23`  
**Issue**: Using `any` type for API response
**Suggestion**: Define `UserResponse` interface

### [WARNING] Security
**File**: `CommentList.vue:15`
**Issue**: Using v-html with user-generated content
**Suggestion**: Use text interpolation or sanitize with DOMPurify

### [INFO] Performance
**File**: `ProductGrid.vue:30`
**Issue**: Large list without virtual scrolling
**Suggestion**: Consider vue-virtual-scroller for 100+ items
```

## Return Condition
Return when review report is generated with all selected reviewers' findings.
