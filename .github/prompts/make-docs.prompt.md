---
mode: agent
description: Generate or update documentation for recently changed files
tools: ["semantic_search", "file_search", "read_file", "insert_edit_into_file", "replace_string_in_file", "get_changed_files"]
---
# Incremental Documentation Update Guide

## Goal
Update or create documentation for recently changed files in the Aiolos Weather Station project, ensuring that technical documentation stays in sync with code changes and maintains consistency across components.

## Focus Areas
- Document only files that have recently changed
- Update existing documentation affected by code changes
- Create new documentation for previously undocumented features
- Ensure changes are reflected in relevant higher-level documentation

## Documentation Types

### Project-Level Documentation
- README.md files with clear project overview and setup instructions
- Architecture diagrams explaining component interactions
- Environment setup guides for development environments
- Deployment guides for production environments
- Contribution guidelines for new developers
- Security considerations and best practices

### Firmware Documentation
- Hardware requirements and pinout specifications
- Sensor integration details and calibration instructions
- Power management strategies and battery life estimates
- Over-the-air update procedures
- Configuration parameters and their effects
- Troubleshooting guides for common issues
- API specifications for HTTP communication

### Backend Documentation
- API endpoints with request/response formats in OpenAPI spec
- Database schema and relationships
- Authentication and authorization mechanisms
- Environment variables and configuration
- Data flow diagrams for important features
- Performance considerations and optimizations
- Deployment and scaling strategies

### Frontend Documentation
- Component hierarchy and design system usage
- State management approaches
- API integration patterns
- Accessibility considerations
- Responsive design implementation
- Testing strategies and tools
- Build and deployment procedures

## Documentation Standards

### Format Requirements
- Use Markdown for all documentation files
- Follow a consistent header hierarchy (# for title, ## for sections, etc.)
- Include a table of contents for documents longer than 3 sections
- Use code blocks with appropriate language tags for code examples
- Include inline comments in code that will be featured in documentation

### Content Guidelines
- Write in clear, concise language appropriate for the target audience
- Provide examples for complex concepts
- Include diagrams for system architecture and workflows
- Update all affected documentation when making code changes
- Maintain version history in major documentation files
- Cross-reference related documentation when applicable
- Document both the "how" and the "why" of implementation choices

## Documentation Locations
- Primary project overview: `/README.md`
- Component-specific documentation: `/[component]/README.md`
- Detailed technical specifications: `/.github/instructions/`
- API documentation: `/apps/adonis-api/openapi.yaml`
- Configuration documentation: In-line with configuration files (e.g., `Config.h`, `platformio.ini`)
- Secrets management: Document template files (e.g., `secrets.ini.example`) with clear instructions

## Incremental Documentation Workflow
1. Identify recently changed files using git history or provided list
2. Assess how the changes impact existing documentation
3. Update directly affected documentation files
4. If no documentation exists for the changed files, create appropriate docs
5. Check if higher-level documentation (like READMEs) needs updates
6. Verify technical accuracy of documentation updates
7. Ensure any new documentation follows project conventions

## Deliverables
- Updated or new documentation specific to recently changed files
- Small, focused documentation changes rather than comprehensive rewrites
- Suggestions for additional documentation if critical gaps are found
- Documentation for new features, parameters, or configurations