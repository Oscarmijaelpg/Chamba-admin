# Database Setup Guide

This guide explains how to set up the Chamba database schema in Supabase.

## Prerequisites

- Supabase account and project
- Supabase CLI installed: `npm install -g supabase`
- Access to your project's dashboard

## Database Schema Overview

The Chamba database includes the following tables:

### Core Tables

1. **users** - Extended user data (role, status, timestamps)
   - Links to Supabase `auth.users` table
   - Tracks last sign-in and user status

2. **profiles** - User profile information
   - Bio, website, location, phone
   - Preferences stored as JSON

3. **sessions** - User session tracking
   - Access and refresh tokens
   - Device/IP information
   - Session expiration

4. **audit_logs** - Action tracking
   - User actions (create, update, delete)
   - Resource changes
   - Status and error tracking

5. **notifications** - User notifications
   - System notifications
   - Read status tracking
   - Notification types and metadata

6. **settings** - Application settings
   - Key-value pairs
   - Public vs private settings
   - Configuration management

## Setup Methods

### Method 1: Supabase Dashboard (Recommended for getting started)

1. **Log in to Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Execute Migration**
   - Copy contents of `database/migrations/001_init_schema.sql`
   - Paste into the SQL editor
   - Click "Run"

4. **Verify Tables Created**
   - Go to "Database" → "Tables"
   - Verify all tables are created:
     - users
     - profiles
     - sessions
     - audit_logs
     - notifications
     - settings

### Method 2: Supabase CLI (Recommended for development)

1. **Link Project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

2. **Create Migration**
   ```bash
   supabase migration new init_schema
   ```

3. **Copy Migration Content**
   - Copy `database/migrations/001_init_schema.sql`
   - Paste into the generated migration file

4. **Push to Supabase**
   ```bash
   supabase db push
   ```

### Method 3: Programmatic (Using Supabase JavaScript Client)

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(URL, KEY);

// Execute migration
const { error } = await supabase.rpc('execute_sql', {
  sql: migrationSQL
});

if (error) console.error(error);
```

## Table Descriptions

### users Table

```sql
-- Core user data linked to Supabase auth.users
CREATE TABLE users (
  id UUID PRIMARY KEY,           -- FK to auth.users
  email VARCHAR(255),             -- Email address
  full_name VARCHAR(255),         -- Display name
  avatar_url TEXT,                -- Profile image
  role VARCHAR(50),               -- user, admin, moderator
  status VARCHAR(50),             -- active, inactive, suspended
  last_sign_in_at TIMESTAMP,      -- Last login time
  created_at TIMESTAMP,           -- Account creation
  updated_at TIMESTAMP            -- Last update
);
```

### profiles Table

```sql
-- Extended user profile information
CREATE TABLE profiles (
  id UUID PRIMARY KEY,            -- FK to users
  bio TEXT,                       -- User biography
  website VARCHAR(255),           -- Website URL
  location VARCHAR(255),          -- Geographic location
  phone VARCHAR(20),              -- Phone number
  preferences JSONB,              -- User preferences (JSON)
  created_at TIMESTAMP,           -- Creation timestamp
  updated_at TIMESTAMP            -- Update timestamp
);
```

### sessions Table

```sql
-- User session tracking
CREATE TABLE sessions (
  id UUID PRIMARY KEY,            -- Session ID
  user_id UUID,                   -- FK to users
  access_token VARCHAR(500),      -- JWT token
  refresh_token VARCHAR(500),     -- Refresh token
  expires_at TIMESTAMP,           -- Token expiration
  ip_address INET,                -- Client IP
  user_agent TEXT,                -- Browser info
  is_active BOOLEAN,              -- Active status
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### audit_logs Table

```sql
-- Action tracking for compliance and debugging
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,            -- Log entry ID
  user_id UUID,                   -- FK to users
  action VARCHAR(100),            -- Action type (create, update, delete)
  resource_type VARCHAR(100),     -- Resource type
  resource_id UUID,               -- Resource ID
  changes JSONB,                  -- Changes made (JSON)
  ip_address INET,                -- Client IP
  user_agent TEXT,                -- Browser info
  status VARCHAR(50),             -- success, failure, pending
  error_message TEXT,             -- Error details
  created_at TIMESTAMP
);
```

### notifications Table

```sql
-- User notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY,            -- Notification ID
  user_id UUID,                   -- FK to users
  type VARCHAR(100),              -- Notification type
  title VARCHAR(255),             -- Notification title
  message TEXT,                   -- Notification message
  data JSONB,                     -- Additional data (JSON)
  is_read BOOLEAN,                -- Read status
  read_at TIMESTAMP,              -- When read
  created_at TIMESTAMP
);
```

### settings Table

```sql
-- Application configuration
CREATE TABLE settings (
  id UUID PRIMARY KEY,            -- Setting ID
  key VARCHAR(255),               -- Unique key
  value JSONB,                    -- Setting value (JSON)
  description TEXT,               -- Setting description
  is_public BOOLEAN,              -- Public or private
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Security Features

### Row Level Security (RLS)

All tables have RLS enabled with policies:

- **users**: Users can read/update their own data, admins can read all
- **profiles**: Users can read/update their own profiles
- **sessions**: Users can read their own sessions
- **notifications**: Users can read/update their own notifications
- **audit_logs**: Users can read their own, admins can read all

### Automatic Timestamps

- `created_at`: Set on insert (automatic)
- `updated_at`: Updated automatically on every modification

### Indexes

Performance indexes on:
- Email lookups (users.email)
- Role-based queries (users.role)
- User status (users.status)
- Session lookups (sessions.user_id)
- Audit log searches (audit_logs.resource_type, action)

## Running Migrations

### Local Development

```bash
# Start Supabase locally
supabase start

# Push migrations
supabase db push

# View logs
supabase logs --all
```

### Production

```bash
# Link to production project
supabase link --project-ref prod-ref

# Push to production
supabase db push
```

## Querying the Database

### Using Supabase Client (JavaScript)

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(URL, KEY);

// Get current user
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

// Get user's notifications
const { data: notifications } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .eq('is_read', false);

// Create session
const { data: session } = await supabase
  .from('sessions')
  .insert([{
    user_id: userId,
    access_token: token,
    expires_at: expiryDate,
    ip_address: ipAddress
  }])
  .select()
  .single();
```

### Direct SQL (SQL Editor)

```sql
-- Get active users
SELECT * FROM users WHERE status = 'active';

-- Count user sessions
SELECT user_id, COUNT(*) as session_count
FROM sessions
WHERE is_active = true
GROUP BY user_id;

-- Recent audit logs
SELECT * FROM audit_logs
ORDER BY created_at DESC
LIMIT 50;
```

## Backup and Restore

### Backup Database

```bash
# Export schema and data
supabase db dump > backup.sql
```

### Restore Database

```bash
# Import backup
psql -f backup.sql
```

## Monitoring

### Check Table Sizes

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Monitor Active Sessions

```sql
SELECT 
  user_id,
  COUNT(*) as active_sessions
FROM sessions
WHERE is_active = true
GROUP BY user_id;
```

## Troubleshooting

### "Permission Denied" Error

- Ensure RLS policies are correctly configured
- Check user authentication status
- Verify table permissions

### "Column Not Found" Error

- Check table and column names
- Ensure migration ran successfully
- Verify schema in database

### Performance Issues

- Check indexes are created
- Monitor query logs: `supabase logs --postgres`
- Review execution plans in SQL editor

## Next Steps

1. **Test Migrations**: Verify tables in Supabase dashboard
2. **Create Indexes**: Add additional indexes as needed
3. **Setup Replication**: Configure backups and replication
4. **Monitor Performance**: Set up alerts for slow queries
5. **Add Views**: Create views for complex queries

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase CLI Guide](https://supabase.com/docs/guides/cli)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
