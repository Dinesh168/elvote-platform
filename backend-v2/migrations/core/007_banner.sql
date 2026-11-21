-- Team banner shown at the top of volunteer Home and the admin Dashboard (spec onboarding-branding OB8).
ALTER TABLE party_constituencies ADD COLUMN IF NOT EXISTS banner_url text;
