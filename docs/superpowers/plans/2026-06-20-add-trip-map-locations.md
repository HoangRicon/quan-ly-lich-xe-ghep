# Add Trip Map Locations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two optional exact address fields for pickup and dropoff locations on trips.

**Architecture:** Store the values directly on `Trip` as nullable text fields, expose them through the existing trips API, and bind them into the existing create/edit trip forms. Keep route fields `departure` and `destination` unchanged.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, PostgreSQL.

---

### Task 1: Data Model

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260620000000_add_trip_map_locations/migration.sql`

- [ ] Add `pickupLocation String? @map("pickup_location")` and `dropoffLocation String? @map("dropoff_location")` to `Trip`.
- [ ] Add SQL migration with `ALTER TABLE "trips" ADD COLUMN "pickup_location" TEXT;` and `ALTER TABLE "trips" ADD COLUMN "dropoff_location" TEXT;`.
- [ ] Run `npm run prisma:generate`.

### Task 2: API Persistence

**Files:**
- Modify: `app/api/trips/route.ts`
- Modify: `app/api/trips/[id]/route.ts`

- [ ] In create/update handlers, read `pickupLocation` and `dropoffLocation`, trim strings, and save `null` for blank values.
- [ ] Include both fields in list, detail, create, and update responses.
- [ ] Add both fields to search matching so exact map addresses can be found.

### Task 3: Forms And Display

**Files:**
- Modify: `components/trip-form.tsx`
- Modify: `components/schedule-list.tsx`

- [ ] Add form state fields initialized to empty string.
- [ ] Prefill fields when editing an existing trip.
- [ ] Send the fields in POST/PUT payloads.
- [ ] Render inputs near `Diem don` and `Diem den`.
- [ ] Show map addresses in the schedule table when present, with copy buttons.

### Task 4: Verification

**Files:**
- No source edits expected.

- [ ] Run `npm run lint`.
- [ ] Report whether verification passed and any pre-existing warnings/errors.
