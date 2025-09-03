-- Update RLS policy to allow viewing all organizations
DROP POLICY IF EXISTS "Users can view orgs they belong to" ON orgs;

CREATE POLICY "Users can view all orgs to join them" 
ON orgs 
FOR SELECT 
TO authenticated
USING (true);