---
name: code-documentation-style
description: Enforces professional, clean, and consistent documentation standards (using JSDoc/TSDoc and inline comments) across the client and server codebases.
---

# Codebase Documentation Style Guide

This skill defines the styling and semantic guidelines for code documentation, comments, and JSDoc blocks across the client (`apps/web`) and server (`apps/server`) codebases.

---

## 1. JSDoc & TSDoc Guidelines for Functions/Classes
- **Use for Exported Code**: Every public/exported helper function, custom hook, service method, or component should have a JSDoc block.
- **Parameters and Returns**: Explicitly define `@param` and `@returns` descriptions if the types or behavior are not entirely trivial.
- **Structure**:
  ```typescript
  /**
   * Summarize the function's purpose in a single, action-oriented sentence.
   * Add extra explanatory paragraphs if the algorithm is non-trivial.
   *
   * @param paramName Description of the parameter.
   * @returns Description of the return value.
   */
  ```

---

## 2. Inline Comments (`//`)
- **Focus on the "Why", Not the "What"**: Do not explain obvious language instructions (e.g., `// check if variable is true`). Instead, document business logic choices, edge cases, and architectural constraints.
- **Placement**: Place comments on a new line above the block they describe, indented correctly. Avoid trailing inline comments on the same line as statements unless they are very brief.
- **Clean Code Principle**: Avoid leaving large commented-out blocks of old code. If the code is deprecated, remove it.

---

## 3. Component & State Comments
- **Props Interfaces**: Annotate custom Prop interface fields using JSDoc-style comments so they populate in editor tooltips.
- **Hooks & Stores**: Add a brief summary block explaining what state is managed and where it is synced.
