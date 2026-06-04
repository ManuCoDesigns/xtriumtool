# User Management & Role System

This application now includes a comprehensive user management system with role-based access control.

## User Roles

### Super Admin
- **Permissions**: Manage all users, assign/modify roles
- **Access**: Admin dashboard, user management
- **Who can do**: Super admin can grant this role to others

### Admin
- **Permissions**: Review submissions, update status/notes, add reviewers
- **Access**: Admin dashboard, submissions queue, reviewer actions
- **Who can do**: Super admin

### Reviewer
- **Permissions**: View and comment on submissions, suggest changes
- **Access**: Submissions queue, review interface
- **Who can do**: Admin or Super Admin

### Submitter
- **Permissions**: Create submissions, view own submissions
- **Access**: Main submission form, submission history
- **Default role**: Assigned to all new users

## Getting Started

### For Users

1. **Sign Up**
   - Visit `/auth` to create an account
   - You'll automatically be assigned the "Submitter" role
   - Set up your profile at `/profile` to add your full name

2. **Submit Datasets**
   - Go to the home page
   - Upload or paste your JSON dataset
   - Run validation to check for issues
   - Use LLM review to reconcile with source HTML
   - Click "Submit for review" to send to reviewers

3. **View Your Profile**
   - Click the profile icon in the header
   - Update your full name
   - View your role and member status

### For Admins

1. **Access Admin Dashboard**
   - Super Admin or Admin can click the settings icon in the header
   - Navigate to "User Management" 
   - Or directly visit `/admin/users`

2. **Manage Users**
   - View all registered users
   - Assign roles: Super Admin, Admin, Reviewer, Submitter
   - Only Super Admin can edit other admin roles

3. **Review Submissions**
   - Visit `/submissions` to see the reviewer queue
   - Click on any submission to review details
   - Update status: pending, approved, rejected, needs_changes
   - Add notes for the submitter

## Database Schema

### profiles table
Stores user profile information synced with Supabase Auth:
- `id` - UUID (references auth.users)
- `email` - User's email
- `full_name` - User's display name
- `role` - User's role (super_admin, admin, reviewer, submitter)
- `created_at` - Profile creation timestamp
- `updated_at` - Last profile update

### user_roles table
Maintains roles separately for RLS policies:
- `id` - UUID
- `user_id` - References profiles.id
- `role` - User's role
- Auto-synced from profiles.role

### submissions table (updated)
Now tracks user associations:
- `user_id` - References auth.users (who submitted)
- `submitted_by_name` - Display name of submitter
- Other fields unchanged

## Authentication Flow

1. User signs up via `/auth`
2. Supabase Auth creates user account
3. `handle_new_user()` trigger auto-creates profile with `submitter` role
4. `on_profile_role_changed()` trigger syncs role to user_roles table
5. Submitter can now upload datasets on main form

## Authorization

Row-Level Security (RLS) policies enforce:

### Viewing Submissions
- Anyone can view all submissions (public)

### Creating Submissions
- Must be authenticated
- Must have submitter, reviewer, admin, or super_admin role

### Updating Submissions
- Only reviewers and admins can update status/notes

### Viewing Profiles
- Users see only their own profile
- Admins see all profiles

### Updating Profiles
- Users can update their own name/email
- Admins can update roles

## Role Assignment Flow

1. Super Admin navigates to `/admin/users`
2. Selects a user from the list
3. Uses dropdown to change role
4. System updates `profiles.role`
5. `on_profile_role_changed()` trigger fires
6. Changes synced to `user_roles` table
7. User gains new permissions immediately

## Troubleshooting

**"You don't have permission to access this page"**
- Only admins can access `/admin/users`
- Contact a super admin to grant admin privileges

**Can't submit datasets**
- Must be signed in with valid account
- Role must be submitter or higher
- Check profile at `/profile`

**Submitted datasets not appearing**
- Submissions require `user_id` to be set
- If not set, may need to re-authenticate
- Check Supabase submissions table: `user_id IS NULL`

## Next Steps

1. Invite admin users:
   - They sign up first
   - Super admin assigns them "Admin" role via `/admin/users`

2. Set up initial super admin:
   - First user created should be made super admin
   - Or manually insert into `profiles` table with `role = 'super_admin'`

3. Configure email notifications (optional):
   - Use Supabase Functions to notify on status changes
   - Notify submitters when their submission is reviewed

4. Add submission history:
   - Users can view past submissions
   - Admins can filter by user, date, status
