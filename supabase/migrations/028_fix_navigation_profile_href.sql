-- Replace hardcoded demo profile slug with a personalized placeholder.
UPDATE public.navigation_links
SET href = '/network/profile/{profileSlug}'
WHERE platform = 'network'
  AND label_key = 'nav.profile'
  AND href = '/network/profile/alex-morgan';
