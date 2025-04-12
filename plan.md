# Darkibox Provider Implementation Plan

## Overview

Based on the API documentation provided for Darkibox and the existing Google Drive provider structure, I will implement a Darkibox provider for Drivebase. The implementation will follow the same patterns established in the codebase.

## Provider Structure

I'll create the following files in a new directory `/libs/providers/src/providers/darkibox/`:

1. `index.ts` - Exports and registers the provider with its capabilities
2. `darkibox.provider.ts` - Main provider class implementing the BaseProvider interface
3. `darkibox.auth.ts` - Authentication strategy for Darkibox (API key-based auth)
4. `darkibox.operations.ts` - Implementation of operations such as upload, download, list, etc.

## Authentication Strategy

Unlike Google Drive which uses OAuth2, Darkibox uses API key authentication. I'll implement:

1. A `DarkiboxAuthStrategy` class that handles API key validation
2. Credentials interface to store the API key
3. Authentication methods to validate the API key using the Account Info endpoint

## Provider Implementation

The `DarkiboxProvider` class will:

1. Extend `BaseProvider` and implement all required methods
2. Define its capabilities based on Darkibox API features
3. Set `authType` to API_KEY instead of OAUTH2
4. Handle initialization and authentication using the API key

## Operations Implementation

The `DarkiboxOperations` class will implement:

1. File uploads (both direct and URL-based)
2. File downloads and metadata retrieval
3. Folder creation and management
4. File deletion
5. File listing with pagination

## API Mapping

I'll map Darkibox API endpoints to Drivebase operations:

| Drivebase Operation | Darkibox API Endpoint            |
| ------------------- | -------------------------------- |
| listFiles           | Folder List                      |
| uploadFile          | Upload File or Upload by URL     |
| downloadFile        | File Direct Link                 |
| getFileMetadata     | File Info                        |
| deleteFile          | File Delete                      |
| createFolder        | Folder Create                    |
| searchFiles         | File List with search parameters |

## Implementation Details

### Authentication

- Use Darkibox Account Info endpoint to validate API key
- No need for refresh token handling (unlike OAuth)
- Store only the API key in credentials

### File Operations

- Map Darkibox's file_code to Drivebase's id
- Transform Darkibox response formats to match Drivebase FileMetadata
- Implement pagination via Darkibox API parameters

### Folder Structure

- Leverage Darkibox's folder capabilities
- Create a root Drivebase folder as needed
- Map folder paths to Darkibox folder IDs

## Next Steps

1. Implement `darkibox.auth.ts` with API key authentication
2. Implement `darkibox.operations.ts` with core file operations
3. Implement `darkibox.provider.ts` with provider registration
4. Create and export provider in `index.ts`
5. Update main provider index to include Darkibox
6. Test the implementation with actual Darkibox credentials
