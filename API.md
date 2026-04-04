# Chamba Admin API Documentation

## Overview

Chamba Admin Panel uses Supabase as the backend for authentication and data management. This document describes the API endpoints available for the admin panel.

## Authentication

All API requests require a valid JWT Bearer token obtained from Supabase Auth.

### Authentication Flow

1. **Sign Up** - Register a new user account
2. **Login** - Authenticate with email and password
3. **Token** - Receive JWT access and refresh tokens
4. **Authenticated Requests** - Use access token in Authorization header

### Adding Auth Header

```javascript
const token = localStorage.getItem('token');
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

## API Endpoints

### Authentication Endpoints

#### Sign Up
```
POST /auth/v1/signup
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2026-04-04T10:00:00Z"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600,
    "expires_at": 1712232000
  }
}
```

#### Login
```
POST /auth/v1/token
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** (Same as Sign Up)

#### Get Current User
```
GET /auth/v1/user
```

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "user_metadata": {},
  "created_at": "2026-04-04T10:00:00Z",
  "updated_at": "2026-04-04T10:00:00Z"
}
```

#### Logout
```
POST /auth/v1/logout
```

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** (204 No Content)

## Validation Rules

### Email Validation
- Pattern: `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- Must be a valid email format
- Error: "Email inválido"

### Password Validation
- Minimum length: 6 characters
- Error: "Contraseña debe tener al menos 6 caracteres"

### Form Validation
Returns validation errors for multiple fields:
```json
{
  "valid": false,
  "errors": {
    "email": "Email inválido",
    "password": "Contraseña debe tener al menos 6 caracteres"
  }
}
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| INVALID_EMAIL | 400 | Email format is invalid |
| WEAK_PASSWORD | 400 | Password does not meet security requirements |
| USER_EXISTS | 409 | User with this email already exists |
| INVALID_CREDENTIALS | 401 | Invalid email or password |
| UNAUTHORIZED | 401 | No valid authentication token provided |
| NOT_FOUND | 404 | Resource not found |
| SERVER_ERROR | 500 | Internal server error |

## OpenAPI Specification

Full API specification in OpenAPI 3.0.0 format is available in `api-spec.yaml`.

### View Interactive Documentation

Use Swagger UI or ReDoc to view interactive API documentation:

```bash
# Using swagger-ui-express (for Node/Express backend)
npm install swagger-ui-express
npm install yaml

# Using ReDoc
npx redoc-cli serve api-spec.yaml
```

## Implementation Examples

### Using Supabase Client

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(URL, KEY);

// Sign Up
const { user, session, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// Login
const { user, session, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Get Current User
const { data: user } = await supabase.auth.getUser();

// Logout
await supabase.auth.signOut();
```

### Using Fetch API

```javascript
const API_URL = 'https://your-project.supabase.co';

// Login
const response = await fetch(`${API_URL}/auth/v1/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { session } = await response.json();
const token = session.access_token;

// Get user with token
const userResponse = await fetch(`${API_URL}/auth/v1/user`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## Security Considerations

1. **HTTPS Only** - Always use HTTPS in production
2. **Token Storage** - Store tokens securely (httpOnly cookies preferred)
3. **Token Expiration** - Check token expiration and refresh when needed
4. **CORS** - Configure CORS properly for your domain
5. **Rate Limiting** - Implement rate limiting on the backend
6. **Input Validation** - Always validate input on both client and server

## Rate Limiting

Supabase applies rate limits to prevent abuse:
- Default: 30 requests per minute per IP
- Contact Supabase for higher limits

## Pagination

(To be implemented in future versions)

## Webhooks

(To be implemented in future versions)

## SDK Reference

### JavaScript/TypeScript

```bash
npm install @supabase/supabase-js
```

[Supabase JS SDK Documentation](https://supabase.com/docs/reference/javascript/introduction)

### React Hooks

The project uses React hooks for Supabase integration. See `src/hooks/` for examples.

## Testing

Run E2E tests for API integration:
```bash
npm run test:e2e
```

## Changelog

### Version 1.0.0 (2026-04-04)
- Initial API documentation
- Authentication endpoints
- Validation rules
- OpenAPI 3.0.0 specification
