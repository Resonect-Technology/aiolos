---
description: "Transform initial ideas into well-scoped, actionable tasks for GitHub Copilot"
mode: "ask"
---

# Task Definition Prompt

Help me transform my initial idea into a well-scoped, actionable task that GitHub Copilot can execute effectively.

## My Idea

${input:idea:Describe your initial idea or problem}

## Task Definition Process

### Step 1: Idea Capture & Clarification

First, let's understand the core problem:

- What problem are you trying to solve?
- What triggered this idea?
- What's the desired outcome or user experience?
- Which part of the system should this affect? (firmware/backend/frontend/infrastructure)

### Step 2: Scope Definition

Based on the component(s) affected, let's define the scope:

**For Frontend Ideas:**

- Is this a new UI component or modification of existing?
- Should this work with real-time data (SSE)?
- Any specific unit conversions needed (m/s, km/h, knots)?
- Mobile responsiveness requirements?
- Should we use existing shadcn/ui components?

**For Backend Ideas:**

- Will this require new API endpoints?
- Are there database schema changes needed?
- Does this affect existing firmware endpoints? (CRITICAL - firmware is deployed)
- Should this broadcast real-time data via SSE?
- Any authentication/validation requirements?

**For Firmware Ideas:**

- How will this affect power consumption?
- Does this require new sensors or modify existing ones?
- Are there cellular connectivity implications?
- Will this work during deep sleep cycles?
- Any configuration parameters needed?

**For Infrastructure Ideas:**

- Is this for development, production, or both?
- Docker/Terraform configuration changes needed?
- Any ARM64 deployment considerations?
- Health check or monitoring implications?

### Step 3: Acceptance Criteria Development

Let's define "done":

- How will we know this is working correctly?
- What should the user see/experience?
- Are there performance requirements?
- What edge cases should we handle?
- How should errors be handled?
- What testing approach should we use?

### Step 4: Constraint Identification

Important constraints to consider:

**Technical Constraints:**

- API backward compatibility (firmware depends on existing endpoints)
- Power consumption limits (battery-operated stations)
- Cellular data usage considerations
- Real-time data flow requirements
- ARM64 deployment architecture

**Project Constraints:**

- Existing API tests must remain valid
- shadcn/ui component preference
- AdonisJS v6 patterns
- Conventional commit format requirements

### Step 5: Complexity Assessment

Let's determine if this is suitable for Copilot:

- Can this be implemented using existing patterns?
- Are there clear examples in the codebase to follow?
- Does this require architectural decisions?
- Is the scope well-defined or are there ambiguities?
- Are there multiple valid approaches to consider?

**Classification:**

- ✅ **Good for Copilot**: Clear scope, existing patterns, well-defined requirements
- ⚠️ **Needs Breakdown**: Split into smaller, more focused tasks
- ❌ **Human-Led**: Complex architectural decisions, ambiguous requirements

### Step 6: Task Breakdown (if needed)

If the task is too complex:

- What's the minimum viable implementation?
- Can we separate backend and frontend work?
- Are there independent components that can be tackled separately?
- What's the logical sequence of implementation?

## Final Task Definition

Based on our discussion, please provide the final task definition using the appropriate template:

### Feature Request Template

```
**Problem Statement:**
[Clear description of the problem]

**Proposed Solution:**
[What should be implemented]

**Acceptance Criteria:**
- [ ] [Specific, testable requirement]
- [ ] [Another requirement]
- [ ] [Edge case handling]

**Component Impact:**
- [ ] Frontend (React/Vite)
- [ ] Backend (AdonisJS)
- [ ] Firmware (ESP32)
- [ ] Infrastructure (Docker/Terraform)

**Constraints:**
- API compatibility: [Yes/No, details]
- Power consumption: [Considerations]
- Real-time data: [SSE requirements]

**Testing Approach:**
[How to verify the implementation]

**Files Likely to Change:**
- [List key files based on component impact]
```

### Quality Gates Check

Before finalizing, ensure:

- [ ] Clear problem statement
- [ ] Specific acceptance criteria
- [ ] Component impact identified
- [ ] Constraints acknowledged
- [ ] Testing approach defined
- [ ] Complexity appropriate for Copilot
- [ ] Files/areas likely to change listed

## Next Steps

Once we have a well-defined task:

1. Review the task definition for completeness
2. Identify the implementation approach
3. Begin development with GitHub Copilot
4. Test and validate the implementation
5. Document any lessons learned

Let's start by discussing your idea: **${input:idea}**
