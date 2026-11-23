# $0 Production Architecture (lab-deploy)

- Flow: User -> Edge/CDN (Vercel/Cloudflare) -> App/API -> Supabase Auth + RLS
- Environments: PR Preview URLs (safe test env) -> verified Production (main)
- GitHub Free: Unlimited repos; 2,000 priv Linux CI min/mo (public unlimited)
- Supabase Free: 2 active projects, 500 MB DB, 50k MAU, 5 GB egress, 1 GB files
- Slot Reuse: Reuse shippulse-dev (Slot 1 of 2); keep Slot 2 in reserve
- 7-Day Pause: Idle DB pauses after 7d (rows kept); handle 503 cold wake
- Vercel Hobby: 100 GB transfer, 1M fn/mo, PR previews; strictly non-commercial
- Cloudflare Free: Unlimited Pages static, 100k Worker req/d, 10 ms; business OK
- Rule: Hobby/portfolio -> Vercel Hobby; commercial/revenue -> Cloudflare Free
