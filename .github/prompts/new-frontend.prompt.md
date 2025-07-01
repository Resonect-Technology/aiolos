---
mode: agent
description: Guide for implementing frontend UI components that consume existing backend APIs
tools: ["semantic_search", "file_search", "read_file", "insert_edit_into_file", "replace_string_in_file", "run_in_terminal"]
---
# Frontend Implementation Guide

## Goal
Create a React frontend component or feature that consumes an existing API endpoint from the Aiolos Weather Station backend, displaying the data in an intuitive and user-friendly manner.

## Requirements

### Frontend Implementation (React)
- Create new component(s) in `apps/react-frontend/src/components/`
- Implement API client function to consume the existing endpoint
- Use proper state management and React hooks
- Handle loading, error, and success states appropriately
- Implement responsive design using the project's UI framework
- Add proper client-side validation
- Ensure accessibility compliance

### UI/UX Design
- Follow the existing design system and component patterns
- Ensure the UI is responsive across different device sizes
- Implement appropriate data visualizations (charts, graphs) if needed
- Design intuitive user interactions for data manipulation
- Consider dark/light mode compatibility
- Include appropriate loading states and error messages
- Design empty states for when data is not available

### Data Handling
- Implement efficient data fetching from the API
- Consider pagination or infinite scrolling for large data sets
- Add proper caching strategies where appropriate
- Implement optimistic UI updates for better user experience
- Handle offline/reconnection scenarios if applicable
- Add proper error boundaries and fallback components

## Constraints
- Use TypeScript for type safety
- Respect the existing component hierarchy and design system
- Follow proper security practices for handling user data
- Ensure browser compatibility across major browsers