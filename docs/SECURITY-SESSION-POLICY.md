# Server-side session policy

The technical profile is independent from operational profile attributes. Network login provisions a Network profile only after authoritative identity verification; no moderator or administrator grants are inherited. Other products are not enabled by Network login. Provider-session identifiers are accepted only after the same bearer was verified by Supabase Auth and its subject matches the provider response. Provider session tombstones must be retained while upstream sessions remain usable: re-exchange must not resurrect a revoked or inactive session.

15-minute product-bound JWTs, two-hour maximum server verification age, seven-day inactivity cutoff. Background exchanges update verification time but not activity. Authenticated activity calls update the server clock. Revocation invalidates the associated access tokens and repeat exchanges for the same provider session. This is a candidate until real-provider staging and frontend activity/logout integration pass. A separate signing secret is required for the final middleware, so older stateless production tokens cannot bypass enforcement.

Additive SQL is separate from operational migrations; preserve current users and do not automatically grant roles. No operational migration or production cutover is implied.
