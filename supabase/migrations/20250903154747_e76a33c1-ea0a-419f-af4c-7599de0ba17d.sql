-- Remove admin role from the system, only keep 'user' and 'hr'
-- Update profiles table role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'hr'));

-- Update org_members table role constraint  
ALTER TABLE org_members DROP CONSTRAINT IF EXISTS org_members_role_check;
ALTER TABLE org_members ADD CONSTRAINT org_members_role_check CHECK (role IN ('user', 'hr'));

-- Update any existing admin roles to hr
UPDATE profiles SET role = 'hr' WHERE role = 'admin';
UPDATE org_members SET role = 'hr' WHERE role = 'admin';