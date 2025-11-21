# Management System - Copilot Instructions

## Project Overview
This is a modular business process automation platform built with Next.js 14, TypeScript, and Tailwind CSS. The system aims to automate manual business processes, analyze data, and provide AI-powered insights.

## Project Structure
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js

## Modules
1. **HR (İnsan Kaynakları)**: Employee management, leave tracking, attendance
2. **Finance (Finans)**: Invoice management, expenses, payments
3. **CRM**: Customer relationship management
4. **Inventory (Stok & Envanter)**: Stock and material tracking
5. **Reports (Raporlama)**: Data analysis and visualization
6. **AI Assistant (AI Asistan)**: AI-powered predictions and recommendations

## Coding Guidelines

### General Rules
- Use TypeScript with strict type checking
- Follow Next.js 14 App Router conventions
- Use functional components with hooks
- Implement proper error handling
- Write clean, maintainable code with proper comments in Turkish when needed

### File Organization
- Group related components in feature folders
- Keep components small and focused
- Use barrel exports (index.ts) for cleaner imports
- Place shared utilities in `/lib`
- Store types in separate `.types.ts` files

### Styling
- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Support both light and dark modes
- Use consistent spacing and color schemes
- Prefer Tailwind classes over custom CSS

### API Routes
- Place API routes in `/app/api`
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Implement proper error handling and status codes
- Use TypeScript for request/response types

### Database
- Use Prisma for database operations
- Define models in `prisma/schema.prisma`
- Use transactions for related operations
- Implement proper data validation

### State Management
- Use React hooks (useState, useEffect, etc.)
- Use Server Components when possible
- Implement proper loading and error states
- Use React Query for data fetching (when added)

### Security
- Validate all user inputs
- Implement proper authentication checks
- Use environment variables for sensitive data
- Sanitize data before database operations

## Development Workflow
1. Create feature branch for new modules
2. Implement UI components first
3. Add API routes and database operations
4. Test functionality thoroughly
5. Update documentation as needed

## Naming Conventions
- **Files**: kebab-case (e.g., `user-profile.tsx`)
- **Components**: PascalCase (e.g., `UserProfile`)
- **Functions**: camelCase (e.g., `getUserData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- **Types/Interfaces**: PascalCase with descriptive names

## Language
- Code: English (variables, functions, components)
- Comments: Turkish (when explaining business logic)
- UI Text: Turkish
- Documentation: Turkish

## Best Practices
- Keep components small and reusable
- Use semantic HTML elements
- Implement proper accessibility (a11y)
- Optimize images and assets
- Use proper TypeScript types (avoid `any`)
- Write descriptive commit messages in Turkish
