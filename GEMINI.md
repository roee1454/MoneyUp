# MoneyUp Codebase Rules & Design System Guidelines

This document defines the strict architecture and design system rules for the MoneyUp codebase. Every code modification or generation must adhere to these guidelines.

---

## 1. Folder Architecture & Organization

### Client-side (`apps/web`)
- **Feature Modules**: Group business domains inside `src/features/<feature-name>/`.
  - Feature-specific UI code goes to `components/`.
  - Feature-specific hooks go to `hooks/`.
  - Feature-specific types belong in `types.ts`.
- **Global UI Components**: Standard generic component libraries go to `src/components/ui/` (e.g., `premium-button.tsx`, `premium-input.tsx`).
- **Core and Globals**: Custom shared hooks go to `src/hooks/`, common libraries to `src/lib/`, routing to `src/routes/` and `src/router.tsx`, state to `src/store/`.

### Server-side (`apps/server`)
- **NestJS Architecture**: All business modules must reside in `src/modules/<module-name>/`.
- **Boilerplate Files**: Every module must follow the NestJS standard:
  - `<module-name>.module.ts`: Module declaration, imports, and exports.
  - `<module-name>.controller.ts`: API route definitions and controller mapping.
  - `<module-name>.service.ts`: Core logic, business operations, and database actions.
- **Testing**: Place unit tests (`*.spec.ts`) in the same directory as the files they test.

---

## 2. UI Design System Guidelines

MoneyUp employs a modern, high-contrast, premium neo-brutalist aesthetic. Maintain the design system strictly:

1. **Anti-Rounding Design Token**:
   - Unless styling standard chat bubbles (`rounded-[24px]`), all interactive components, form elements, inputs, and buttons must use `rounded-none`. Do **NOT** use browser defaults or standard Tailwind roundings (`rounded-md`, `rounded-lg`).
2. **Standard Premium Wrappers**:
   - **Textareas**: Use the `PremiumTextarea` component from `@/components/ui/premium-textarea`.
   - **Inputs**: Use the `PremiumInput` component from `@/components/ui/premium-input`.
   - **Buttons**: Use the `PremiumButton` component from `@/components/ui/premium-button` (variant: `default`, `outline`, `ghost`, `accent`; size: `default`, `icon`, `sm`).
3. **Borders and Shadows**:
   - Maintain thin borders: `border border-border/30` or `border border-border/40`.
   - Use standard subtle shadows for static card layouts (`shadow-sm`) or glowing soft-shimmers for premium interactive features (`shadow-lg shadow-primary/10`).
4. **Responsive Layouts & RTL Positioning**:
   - The interface is styled with RTL (`dir="rtl"`). To avoid horizontal overflow scrollbugs on mobile viewports, do **NOT** use large negative absolute offsets relative to a full-width container (e.g. `w-full relative` with `absolute -left-10`).
   - Instead, wrap elements in responsive max-width flex bounds (such as `max-w-[85%] sm:max-w-[75%]`) and position context buttons relative to the inner flex boundaries.

---

## 3. Shared Packages (@packages) Architecture & Rules

All shared code under the `packages/` directory must adhere to the modular boundaries and dependency rules defined in [packages/README.md](file:///home/eviltwin/Projects/MoneyUp/packages/README.md). Key constraints include:

1. **Browser Safety for @money-up/common**:
   - The universal package `@money-up/common` must remain browser-safe and framework-agnostic. It must never import backend-only NestJS dependencies or Node.js runtime globals.
2. **NestJS Isolation in @money-up/common/backend**:
   - NestJS exceptions, filters, and interceptors must be strictly mapped under the `./backend` subpath export and kept isolated from client bundles.
3. **Workspace Resolution Only**:
   - Applications must declare and import shared packages using the pnpm workspace protocol (`workspace:*`). Bypassing compile boundaries using raw typescript source file path aliases in production configs is prohibited.
4. **Zero Circular Imports**:
   - Shared packages must never import modules or configs from client or server applications (`apps/*`).
