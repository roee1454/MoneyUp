---
name: nest-module-generator
description: Automatically generates a standard NestJS boilerplate module (controller, service, module, and spec files) inside apps/server/src/modules/
---

# NestJS Module Generator

This skill guides the creation of a standard NestJS module in `apps/server/src/modules/`.

## When to Use This Skill
Use this skill when the user requests a new feature module, API endpoint, or service on the NestJS backend.

## Step-by-Step Instructions

1. **Create the Folder**:
   Create a new folder at `apps/server/src/modules/<module-name>`.

2. **Generate the Module File (`<module-name>.module.ts`)**:
   - Create class `<ModuleName>Module` decorated with `@Module`.
   - Wire up imports, controllers, providers, and exports.
   Example:
   ```typescript
   import { Module } from '@nestjs/common';
   import { <ModuleName>Controller } from './<module-name>.controller';
   import { <ModuleName>Service } from './<module-name>.service';

   @Module({
     controllers: [<ModuleName>Controller],
     providers: [<ModuleName>Service],
     exports: [<ModuleName>Service],
   })
   export class <ModuleName>Module {}
   ```

3. **Generate the Service File (`<module-name>.service.ts`)**:
   - Create class `<ModuleName>Service` decorated with `@Injectable`.
   - Add logger and default methods.

4. **Generate the Controller File (`<module-name>.controller.ts`)**:
   - Create class `<ModuleName>Controller` decorated with `@Controller('<module-route>')`.
   - Use standard NestJS route decorators (`@Get`, `@Post`, `@Body`, etc.).

5. **Generate Unit Tests**:
   - Create `<module-name>.controller.spec.ts` and `<module-name>.service.spec.ts` with standard Jest testing mocks.

6. **Register the Module**:
   - Import the newly created module inside `apps/server/src/app.module.ts` and add it to the `@Module` imports array.
