# Roadmap

_Last verified against `main` 2026-04-18._

## Near-term

- [ ] **Wire signed lab-upload invites end-to-end** — the HMAC token scheme is live (`lib/lab-upload-token.ts`), but the "invite inspector" flow still needs to generate the token, email the signed `/lab?token=...` link, and set `LAB_UPLOAD_SIGNING_SECRET` in Vercel.
- [ ] **Upgrade copper source from COMEX proxy to official LME** — the cron currently ingests COMEX copper via Yahoo Finance (`comex_delayed_yahoo`) as a free daily proxy. Replace with LME Real-Time feed or Bloomberg when commercials allow.
- [ ] **Bunker fuel feed** — replace the static `$550/t` VLSFO assumption in the freight calculator with a Ship & Bunker or BunkerEx API pull.
- [ ] **Additional LME base metals** — nickel and aluminium have no free daily proxy (COMEX aluminium is illiquid; LME nickel has no free feed). Still waiting on paid access.
- [ ] Phase 3 external-API integrations for the supply-chain timeline engine (ref commit `2d5b05d`, `docs/`)
- [ ] Continue audit-driven UX polish — skeletons, loading states, mobile corridor view (continuing `970a7a4`, `e2c460a`, `f004367`)

## Partnership / commercial

- [ ] **BSEC integration** on top of the platform-native signing flow (`edc2941`):
  - FX forward / option execution (USD/ZAR)
  - Commodity price-swap execution (chrome, manganese OTC)
  - Letter-of-credit facilitation
  - Escrow account management (pre-blockchain L3)
  - Credit-insurance brokerage
  - Live FX forward rates to replace static 3.25% p.a. estimate in `lib/data-sources.ts`

## Platform

- [ ] **Datalastic vessel enrichment** — ~79% of AIS vessels are type-unknown; paid feed (~$50/mo) fills that in.
- [ ] **Sinay port congestion** — replace the AIS-derived vessel count with real-time feed.
- [ ] Broaden data ingestion coverage (rails, ports, mines, prices) and surface freshness/accuracy everywhere.

## Done since prior roadmap (for reference, not revisit)

- ✅ Signed lab-upload tokens (`lib/lab-upload-token.ts`, `/api/lab-upload` gated by `LAB_UPLOAD_SIGNING_SECRET`) — 2026-04-18
- ✅ Daily COMEX copper ingest in the cron refresh job (`comex_delayed_yahoo` source) — 2026-04-18
- ✅ Term-sheet PDF generator (`/api/deals/[id]/term-sheet`, `@react-pdf/renderer`) — 2026-04-18
- ✅ Lab integration: assay capture, email notification to both parties (Resend), verification-panel pass/fail display (`cf21358`, `3c779bb`, `6a6c0a6`)
- ✅ Position book (`app/positions/`) — aggregate exposure per commodity
- ✅ Global search / Cmd+K, P&L tracker per deal (`1de3ca3`)
- ✅ Reverse-waterfall simulator + scenarios CRUD + share links (`8950fd5`)
- ✅ Platform-native deal signing (`edc2941`) + migration `20260410_deal_signatures.sql`
- ✅ LBMA daily ingest (gold, silver, platinum, palladium) in the cron refresh job
- ✅ Test coverage for price waterfall, forward waterfall, route optimizer, trust score, spec comparison, supply-chain timeline, lab parser, lab notifications, lab summary, sea routes, distance, deal helpers, format, constants
