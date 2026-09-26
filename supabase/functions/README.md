# Edge functions

Source of truth for the functions deployed to the Supabase project. Shared code
lives in `_shared/`. Deploy a function with the Supabase CLI:

```
supabase functions deploy poll-feeds --no-verify-jwt
supabase functions deploy add-feed --no-verify-jwt
supabase functions deploy fetch-feed-entries --no-verify-jwt
supabase functions deploy import-opml
supabase functions deploy proxy-article
```

`poll-feeds`, `add-feed` and `fetch-feed-entries` validate the caller inside
the function (cron secret or bearer token), which is why `verify_jwt` is off.
