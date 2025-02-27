# WebSocket and Authentication Issues Analysis

## Current Issues

### 1. WebSocket Connection Problems
- **Symptoms**:
  - WebSocket connections failing with code 1008 (Policy Violation)
  - Authentication validation failing during connection handshake
  - Inconsistent session handling between HTTP and WebSocket connections

- **Error Messages**:
  - "No session cookie found"
  - "Invalid session"
  - "Authentication required"

### 2. Session Management Issues
- **Current Implementation**:
  - Session cookie name: 'sessionId'
  - Cookie settings in auth.ts:
    ```javascript
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    }
    ```
  - Session store using either MemoryStore or PostgreSQL store

## Root Cause Analysis

### 1. Session Cookie Transmission
- WebSocket upgrade requests may not include session cookies due to:
  - Cross-origin issues
  - Cookie path/domain mismatch
  - Secure flag preventing cookie transmission in development

### 2. Authentication Flow
- Current flow relies on Express session middleware
- WebSocket connections bypass Express middleware
- Manual session parsing in WebSocket upgrade may be incomplete

### 3. Session Store Access
- Potential race conditions during session retrieval
- Async operations in WebSocket connection handler might not be properly handled

## Troubleshooting Plan

### Phase 1: Diagnostic Steps
1. Add comprehensive connection logging:
   ```javascript
   logger.debug('WS Connection attempt', {
     headers: req.headers,
     cookies: req.headers.cookie,
     origin: req.headers.origin
   });
   ```

2. Verify session store functionality:
   - Test session creation in HTTP routes
   - Confirm session persistence
   - Validate session retrieval in WebSocket handler

3. Monitor client-side behavior:
   - Log WebSocket connection attempts
   - Track reconnection patterns
   - Document error responses

### Phase 2: Immediate Fixes

1. Session Cookie Configuration:
   ```javascript
   sessionSettings.cookie = {
     secure: false, // Temporarily disable for testing
     httpOnly: true,
     sameSite: 'lax',
     path: '/',
   };
   ```

2. WebSocket Connection Handler:
   - Implement proper error handling
   - Add request origin validation
   - Improve session validation logic

3. Client-side Updates:
   - Enhance reconnection logic
   - Improve error handling
   - Add connection state management

### Phase 3: Long-term Solutions

1. **Authentication Simplification**:
   - Consider implementing token-based authentication for WebSocket connections
   - Use separate authentication mechanism for WebSocket vs HTTP

2. **Alternative Approaches**:
   - Use Socket.IO instead of raw WebSocket (handles auth better)
   - Implement heartbeat mechanism
   - Add connection state tracking

## Recommendations

1. **Short-term**:
   - Temporarily disable WebSocket features
   - Fall back to polling for real-time updates
   - Focus on stabilizing core authentication

2. **Development Process**:
   - Add comprehensive WebSocket testing
   - Implement connection monitoring
   - Create separate dev/prod configurations

3. **Next Steps**:
   1. Implement Phase 1 diagnostic logging
   2. Verify session store functionality
   3. Test with simplified authentication
   4. Gradually re-enable WebSocket features

## Action Items Priority

1. Add detailed logging throughout WebSocket lifecycle
2. Verify session store operations
3. Test connection handling with simplified auth
4. Implement proper error handling
5. Add connection state management
6. Review and update client reconnection logic
