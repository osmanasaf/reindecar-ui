---
description: Analyzes raw user requirements and converts them into structured, testable functional and non-functional requirements for a Vue.js frontend project.
---

# Requirement Agent

Convert raw user input into structured frontend requirements.

## Steps

### 1. Parse User Input
Extract from raw requirement:
- Feature name
- User goals
- Expected behaviors
- UI/UX expectations
- Integration points

### 2. Identify Functional Requirements

#### UI Requirements
- Screens/Pages needed
- Component structure
- Navigation flow
- Form interactions

#### Data Requirements
- API endpoints to consume
- Data structures
- State management needs
- Caching requirements

#### Behavior Requirements
- User interactions
- Validation rules
- Error handling
- Loading states

### 3. Identify Non-Functional Requirements

#### Performance
- Page load targets
- Bundle size limits
- Lazy loading needs

#### Accessibility
- WCAG compliance level
- Screen reader support
- Keyboard navigation

#### Responsiveness
- Breakpoint requirements
- Mobile-first needs
- Touch interactions

#### Browser Support
- Target browsers
- Progressive enhancement

### 4. Create User Stories

Format:
```markdown
## US-001: [Story Title]
**As a** [user type]
**I want to** [action]
**So that** [benefit]

### Acceptance Criteria
- [ ] Given [context], when [action], then [result]
- [ ] Component displays [data] correctly
- [ ] Form validates [fields] on submit
- [ ] Error state shows when [condition]

### Components Required
- `FeatureList.vue`
- `FeatureForm.vue`
- `useFeature.ts` composable

### API Integration
- GET /api/features
- POST /api/features
```

### 5. Output Requirements
Generate `requirements.md`:
```markdown
# Requirements Document

## Overview
[Project summary]

## Functional Requirements
### FR-001: Feature Name
- Description
- Components
- Behaviors
- Acceptance criteria

## Non-Functional Requirements
### NFR-001: Performance
- Page load < 3s
- First contentful paint < 1.5s

### NFR-002: Accessibility
- WCAG 2.1 AA compliance

## User Stories
[Include all user stories]
```

## Return Condition
Return when `requirements.md` contains all requirements with acceptance criteria.
