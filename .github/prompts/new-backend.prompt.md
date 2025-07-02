---
mode: agent
description: Guide for implementing backend support for new data points in the Aiolos Weather Station
tools: ["semantic_search", "file_search", "read_file", "insert_edit_into_file", "replace_string_in_file", "run_in_terminal"]
---
# Backend Data Point Implementation Guide

## Goal
Implement the backend support for a new data point transmitted from the Aiolos Weather Station firmware, including database storage, API endpoints, and data handling.

## Requirements

### Backend Side (AdonisJS API)
- Create or update the appropriate model in `apps/adonis-api/app/models/`
- Create database migrations using the AdonisJS CLI (`node ace make:migration`)
- Implement the controller endpoint in `apps/adonis-api/app/controllers/`
- Add data validation for the incoming data point
- Implement proper error handling
- Add the new data point to the live data stream if applicable

### Data Management
- Ensure the database schema is properly designed for the new data
- Add appropriate indexes for query performance
- Implement data validation before storage
- Include timestamps for data tracking
- Ensure the model relationships are correctly defined

## Notes
- The OpenAPI specification is generated automatically from the backend code, so there's no need to update it manually
- Use the AdonisJS CLI tools for generating models and migrations
- Follow the established patterns in the existing codebase

## Constraints
- Follow existing code patterns and style
- Ensure backward compatibility with existing data
- Implement proper error handling and validation
- Use the Adonis Lucid ORM for database operations
- Follow RESTful API design principles