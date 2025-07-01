---
mode: agent
description: Guide for implementing end-to-end features with backend API and frontend UI
tools: ["semantic_search", "file_search", "read_file", "insert_edit_into_file", "replace_string_in_file", "run_in_terminal"]
---
# End-to-End Feature Implementation Guide

## Goal
Create a complete end-to-end implementation of a new feature in the Aiolos Weather Station project, including both the API endpoint in the AdonisJS backend and the corresponding React component in the frontend.

## Requirements

### Backend API Endpoint (AdonisJS)
- Design a RESTful or resource-based endpoint following API best practices
- Create or update appropriate model(s) in `apps/adonis-api/app/models/`
- Implement necessary database migrations if required
- Develop controller logic in `apps/adonis-api/app/controllers/`
- Implement proper data validation and error handling
- Add necessary middleware for authentication/authorization if needed
- Update OpenAPI specification in `apps/adonis-api/openapi.yaml`
- Add unit and/or integration tests for the new endpoint
- Consider rate limiting and performance implications

### Frontend Implementation (React)
- Create new component(s) in `apps/react-frontend/src/components/`
- Implement API client function to consume the new endpoint
- Use proper state management and React hooks
- Handle loading, error, and success states appropriately
- Implement responsive design using the project's UI framework
- Add proper client-side validation
- Ensure accessibility compliance
- Create unit tests for the new component(s)

### Integration
- Ensure consistent data types and field naming between frontend and backend
- Test the complete data flow from backend to frontend
- Implement proper error handling on both ends
- Consider optimistic UI updates where appropriate
- Add necessary authentication token handling
- Consider pagination or infinite scrolling for data lists if needed
- Test browser compatibility and mobile responsiveness

## Constraints
- Follow existing code style and patterns in both codebases
- Use TypeScript for type safety across the stack
- Respect the existing component hierarchy and design system
- Consider performance implications, especially for mobile devices
- Follow proper security practices for handling user data
- Ensure backwards compatibility with existing API consumers
- Add proper documentation for both frontend and backend changes
- Consider i18n/localization requirements if applicable

## Deliverables
- Backend API endpoint with tests and documentation
- Frontend component(s) with tests
- API client code for frontend-backend communication
- Updated OpenAPI documentation
- Usage examples for the new feature