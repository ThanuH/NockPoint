# IANSEO-ON-STEROIDS — Complete User Story Backlog (`US-01` to `US-24`)

Work through these stories in order. When you finish a story, tell me **"Done with US-XX"** (or ask any questions if you hit an error), and I will guide you through the next story with detailed explanations and code patterns.

---

## Epic 1: Foundation, Docker PostgreSQL & Core Tournament Schema

### `US-01`: Project Scaffolding, Docker PostgreSQL 16 & Prisma Setup
- **Story**: As a developer, I want a Next.js + TypeScript + Tailwind CSS project connected to a local PostgreSQL 16 Docker container via Prisma so I have a reliable, type-safe foundation.
- **Tasks**:
  1. Initialize Next.js (App Router, TypeScript, Tailwind CSS) inside `ianso-on-steriods/`.
  2. Create `docker-compose.yml` for PostgreSQL 16 (`port 5432`, db `ianseo_steroids`).
  3. Install Prisma (`prisma`, `@prisma/client`), initialize `prisma/schema.prisma`, and create a health-check table + `/api/health` endpoint.
- **Acceptance Criteria**: `docker compose up -d` starts PostgreSQL, `npx prisma migrate dev` succeeds, and `GET /api/health` returns `{ status: "ok", db: "connected" }`.

### `US-02`: Core Tournament, Session, Division, Age Class, Distance & Target Face Schema
- **Story**: As a tournament organizer, I want the database to store tournaments, shooting sessions, bow divisions, age classes (with valid shoot-up rules), distances, and target faces.
- **Tasks**:
  1. Add `Tournament`, `Session`, `Division`, `AgeClass`, `SubClass`, `DistanceRule`, and `TargetFace` models to `prisma/schema.prisma`.
  2. Run `npx prisma migrate dev --name core_tournament_schema`.
  3. Write `prisma/seed.ts` to seed standard target definitions (`122cm Outdoor`, `80cm 6-Ring Compound`, `40cm Indoor`, `40cm Triple-Spot`).
- **Acceptance Criteria**: Tables are created in PostgreSQL with proper foreign keys and `npx prisma db seed` populates baseline target faces.

### `US-03`: Pluggable Ruleset Engine & Competition Setup UI
- **Story**: As a tournament organizer, I want to create a tournament by selecting a federation ruleset (World Archery, USA Archery/JOAD, or Custom Multi-Class) so divisions, classes, distances, and target faces are auto-configured.
- **Tasks**:
  1. Create `src/domain/rulesets/` defining presets for `WA 720 (70m/50m)`, `WA 1440`, `WA Indoor 18m`, and `USA Archery JOAD`.
  2. Build `POST /api/tournaments` (create, update, clone, lock, delete) and the **Competition Setup UI** (`/competition`).
- **Acceptance Criteria**: Creating a new tournament auto-populates its divisions, age classes, sessions, and distance rules, and allows toggling **Multi-Age-Category Participation** (`SINGLE_CLASS_STRICT`, `SEPARATE_SESSIONS`, `SHARED_SCORE`, `BOTH`).

---

## Epic 2: Archers, Multi-Age-Category Registrations & Importers

### `US-04`: Archer Profile & Multi-Category Registration Schema
- **Story**: As a tournament organizer, I want an archer's personal profile (`Archer`) separated from their tournament shooting slots (`TournamentRegistration`) and category enrollments (`RegistrationCategory`) so one archer can compete in multiple age categories or bow divisions.
- **Tasks**:
  1. Add `Club`, `Archer`, `TournamentRegistration`, and `RegistrationCategory` models to `prisma/schema.prisma`.
  2. Write the domain validator `src/domain/rulesets/registrationValidator.ts` that enforces `AgeClass.validShootUpClasses` and the tournament's `multiClassMode`.
- **Acceptance Criteria**: An archer born in 2009 (`Natural Class: CM`) can register in `CM` *and* enroll in `JM` or `M` (either in a second session or sharing their qualification score if distances match).

### `US-05`: Keyboard-First Participant Grid & Multi-Category Registration UI
- **Story**: As a registration desk operator, I want a fast, keyboard-navigable (`Tab` / `Enter`) participant table and a multi-category enrollment drawer so I can register walk-in archers in seconds.
- **Tasks**:
  1. Build `GET/POST/DELETE /api/participants` including 1-click **Delete All Participants**.
  2. Build `/participants` with the Quick-Entry Bar, inline category badges showing all age classes an archer is enrolled in, and status toggles.
- **Acceptance Criteria**: Operator can add an archer using only the keyboard and attach a second age class enrollment in 2 clicks.

### `US-06`: Unified Importer & Template Generator (21-Col Ianseo TSV, EventBooking, Cognito)
- **Story**: As a tournament organizer, I want to import participant lists from legacy 21-column Ianseo `.tab` files, Joomla EventBooking CSVs, or Cognito Forms exports, and download a clean template.
- **Tasks**:
  1. Build `src/domain/importers/tsvImporter.ts` and `csvImporter.ts` (handling both Windows `\r\n` and Unix `\n` line endings).
  2. Add the Import Wizard & Template Download endpoint to `/participants`.
- **Acceptance Criteria**: Uploading a 21-column `.tab` file or EventBooking CSV creates `Club`, `Archer`, `TournamentRegistration`, and `RegistrationCategory` records accurately.

### `US-07`: Automated Target Draw & Accreditation Check-In Desk
- **Story**: As a Director of Shooting, I want an automated target draw that assigns archers to bales (`001A..024D`) while separating club teammates and preventing target collisions for multi-session archers.
- **Tasks**:
  1. Implement `src/domain/targets/autoDraw.ts` (club-interleaving algorithm + formatted `1001A` target numbers).
  2. Build the Target Assignment UI, Session Mover, and Accreditation Check-In / Fee Payment desk.
- **Acceptance Criteria**: Running Auto-Draw assigns unique bale/letter positions, separates same-club teammates, and updates accreditation check-in status.

---

## Epic 3: Arrow Encoding Engine & Qualification Scoring

### `US-08`: Arrow-Letter Encoding Engine & Ring Coordinate Math
- **Story**: As a developer, I want a pure TypeScript module that encodes/decodes Ianseo arrow letters (`A..Z`, `a..z` stars), computes `Score / Golds / XNines`, evaluates Shoot-Off weights, and maps `(x, y)` SVG click coordinates to target rings.
- **Tasks**:
  1. Build `src/domain/arrows/arrowEngine.ts` and `targetDefinitions.ts`.
  2. Write Vitest unit tests verifying every target face type (`Outdoor 10-ring`, `Compound 6-ring`, `Indoor Triple-Spot`, `Field 1-6`).
- **Acceptance Criteria**: All unit tests pass for arrow decoding, `10+X` vs `10/9` indoor counting, and `(x, y)` click-to-ring conversion.

### `US-09`: Normalized Qualification Scoring Schema & Standard Score Input Grid
- **Story**: As a scorer, I want to enter distance scores, hits, golds, and X-nines in a fast tabular grid that automatically updates the archer's total score.
- **Tasks**:
  1. Add `QualDistanceScore` and `QualEndScore` to `prisma/schema.prisma`.
  2. Build `POST /api/qualification/score` and the Standard Qualification Score Table (`/qualification`) with a direct **"Arrows"** jump button on every row.
- **Acceptance Criteria**: Entering Distance 1 and Distance 2 scores persists to `QualDistanceScore` and updates cached totals on `TournamentRegistration`.

### `US-10`: Arrow-by-Arrow Scorecard Editor & Interactive SVG Target Face Spotter
- **Story**: As an advanced scorer, I want to enter scores arrow-by-arrow via keyboard or by clicking directly on an interactive SVG target face.
- **Tasks**:
  1. Build `<TargetFaceSpotter />` SVG component with zoom, ring rendering, and numbered arrow markers.
  2. Build the End-by-End Scorecard drawer connected to `QualEndScore`.
- **Acceptance Criteria**: Clicking the SVG target face or typing `X, 10, 9, M` populates the end, computes `Score/Golds/XNines` automatically, and stores `(x, y)` arrow coordinates.

### `US-11`: Multi-Category Qualification Ranking Calculator
- **Story**: As a tournament organizer, I want the ranking engine to compute distance ranks and total category ranks across all `RegistrationCategory` enrollments (including shared-score multi-class entries).
- **Tasks**:
  1. Build `src/domain/ranking/categoryRanker.ts` sorting by `Score DESC, Golds DESC, XNines DESC` with tie-rank assignment (`1, 2, 2, 4`).
  2. Trigger automatic rank recalculation on score updates and build the Category Leaderboard view.
- **Acceptance Criteria**: An archer enrolled in both `JM` and `M` (shared score) receives accurate independent ranks in both categories.

---

## Epic 4: Championship Events, Shoot-Offs & Automatic Team Builder

### `US-12`: Championship Events & `EventClassRule` Mapping Matrix
- **Story**: As a tournament organizer, I want to configure Individual, Team, and Mixed Team championship events and define which `Division + Class` categories feed into each event.
- **Tasks**:
  1. Add `Event`, `EventClassRule`, `IndividualEventRank`, `Team`, and `TeamMember` to `prisma/schema.prisma`.
  2. Build the Event Configuration UI (`/competition/events`) supporting Set System vs. Cumulative mode and starting phases (`1/64` to `1/2`).
- **Acceptance Criteria**: Organizers can view and customize which categories feed into each championship event.

### `US-13`: Absolute Event Ranking & Cutoff Shoot-Off / Coin-Toss Resolution
- **Story**: As a judge, I want the system to detect ties at the qualification cutoff boundary (`Red Shoot-Off`) and ties inside the qualified zone (`Yellow Coin-Toss`) and require resolution before seeding brackets.
- **Tasks**:
  1. Build `src/domain/ranking/eventRanker.ts` implementing World Archery cutoff shoot-off detection.
  2. Build the Shoot-Off Resolution screen (`/qualification/shootoffs`) where judges enter shoot-off arrows (`10`, `10*`, `9`) to break ties.
- **Acceptance Criteria**: Ties at the cutoff (e.g. 16th vs 17th place) are flagged in red and resolved accurately via shoot-off arrow entry.

### `US-14`: Automatic Team & Custom Club Team Builder
- **Story**: As a tournament organizer, I want the system to automatically compose club teams (standard 3-archer teams, 2-archer Mixed Teams, and custom multi-class club teams) from top qualification scores.
- **Tasks**:
  1. Build `src/domain/ranking/teamBuilder.ts` supporting standard World Archery team rules and custom multi-class club team rules.
  2. Build the Team Qualification Leaderboard and manual team component override UI.
- **Acceptance Criteria**: Top eligible archers per club are aggregated into teams, ranked by combined score/golds/xnines, and displayed with their member lists.

---

## Epic 5: Elimination Pool Rounds

### `US-15`: Elimination Round 1 & Round 2 Pools
- **Story**: As a Field/3D tournament organizer, I want to run 1 or 2 pool elimination rounds between Qualification and Finals.
- **Tasks**:
  1. Add `EliminationEntry` to `prisma/schema.prisma`.
  2. Build `/eliminations` to seed Round 1 & Round 2 from qualification ranks, assign targets, enter scores, and rank qualifiers for Finals.
- **Acceptance Criteria**: Archers qualify from Qualification $\rightarrow$ Elimination Round 1 $\rightarrow$ Elimination Round 2 $\rightarrow$ Finals.

---

## Epic 6: Olympic Matchplay Brackets, Set System & Schedule Conflict Guard

### `US-16`: Binary Bracket Grid (`MatchNo 0..127`) Seeding & Auto-BYE Progression
- **Story**: As a tournament organizer, I want qualified archers and teams seeded onto the standard World Archery binary bracket (`Grids 0..127`) with automatic BYE advancement when a bracket isn't full.
- **Tasks**:
  1. Add `BracketGrid` and `BracketMatch` to `prisma/schema.prisma` and seed the 128 grid positions.
  2. Build `src/domain/brackets/bracketSeeder.ts` that maps seed `#1..#64` onto `BracketMatch` and auto-advances BYEs (`tieStatus = 2`).
- **Acceptance Criteria**: Seeding a 1/8 bracket (16 slots) with 12 archers automatically advances the top 4 seeds past their BYEs into the 1/4 Quarter-Finals.

### `US-17`: Matchplay Scoring Engine (Set System vs. Cumulative + Shoot-Offs)
- **Story**: As a scorer, I want the matchplay engine to calculate Set Points (`2` for set win, `1` for set tie, `0` for loss; first to `6` Ind / `5` Team) or Cumulative totals, evaluate 1-arrow shoot-offs (including closest-to-center `*`), and advance winners to $\lfloor m / 2 \rfloor$.
- **Tasks**:
  1. Build `src/domain/brackets/matchProgression.ts` (including Semi-Final winners $\rightarrow$ Gold Match `0/1` and Semi-Final losers $\rightarrow$ Bronze Match `2/3`, plus final rank calculation `1, 2, 3, 4, 5..8, 9, 17, 33`).
  2. Write unit tests covering Set System, Cumulative, BYEs, and Shoot-Off tiebreaks.
- **Acceptance Criteria**: Winning a Quarter-Final match automatically places the winner into the corresponding Semi-Final slot and assigns ranks `5..8` to quarter-final losers.

### `US-18`: Interactive Visual Bracket Tree & Dual SVG Target Spotting Editor
- **Story**: As a match scorer or spotter, I want a visual horizontal bracket tree where clicking any match opens a side-by-side scorecard and dual SVG target face spotter.
- **Tasks**:
  1. Build `<BracketTree />` and `<MatchSpotterModal />` in `/finals`.
  2. Support both quick set/total score entry and arrow-by-arrow target face spotting with live broadcast toggling.
- **Acceptance Criteria**: Clicking a match on the bracket tree allows spotting arrows for both competitors and advancing the winner in real time.

### `US-19`: Match Schedule Manager with Multi-Age-Category Conflict Guard
- **Story**: As a Director of Shooting, I want to assign target numbers and start times to final matches, with an automatic warning if an archer competing in multiple age classes is scheduled on two targets at the same time.
- **Tasks**:
  1. Build `src/domain/brackets/scheduleConflictDetector.ts`.
  2. Build the Finals Schedule & Target Assignment grid (`/finals/schedule`) highlighting any multi-category archer time collisions.
- **Acceptance Criteria**: Scheduling the same archer (`archerId`) in `RJM` at `14:00` on Target 3 and `RM` at `14:00` on Target 1 triggers an immediate conflict alert with a 1-click stagger option.

---

## Epic 7: Official ORIS & Ianseo Printout Suite

### `US-20`: Operational Printouts (Start Lists, Scorecards, Back Numbers, Badges, FOP Layout)
- **Story**: As a tournament organizer, I want print-ready PDFs/sheets for Start Lists (by Target, Alphabetical, Club), Paper Scorecards, Athlete Back Numbers, Accreditation Badges, and the Field of Play (FOP) Bale Diagram.
- **Tasks**:
  1. Build `/printouts` with dedicated print templates and `@media print` page-break styling.
- **Acceptance Criteria**: All 6 operational printouts render cleanly in A4 or US Letter format with club logos and target assignments.

### `US-21`: Official World Archery ORIS Result Reports & Complete Result Book
- **Story**: As a tournament director, I want World Archery ORIS-formatted result sheets (`C73A` Category Results, `C73B` Event Qualification, `C73C` Team Results, `C75A` Brackets, `C93` Medallists) and a 1-click Complete Result Book.
- **Tasks**:
  1. Add ORIS header blocks, document version tracking, and medal summary generators to `/printouts`.
- **Acceptance Criteria**: Organizers can print individual ORIS reports or collate the entire tournament book in one click.

---

## Epic 8: Fault-Tolerant TV Display, Live Results Hub, ISK Mobile & Auth

### `US-22`: Fault-Tolerant Venue TV Display Rotator
- **Story**: As a venue operator, I want a full-screen TV display rotator (`/tv`) that cycles through live qualification leaderboards, active final matches, and team standings via background AJAX/SSE without ever crashing to a blank screen if Wi-Fi drops.
- **Tasks**:
  1. Add `TvChannel` and `TvSlideRule` models to `prisma/schema.prisma`.
  2. Build `/tv` with client-side state caching, network health indicator, configurable slide duration, and auto-scroll.
- **Acceptance Criteria**: Disconnecting the network while `/tv` is running keeps the last valid leaderboard rotating smoothly until connection resumes.

### `US-23`: Public Spectator Live Results Hub & S3 Static JSON Publisher
- **Story**: As a spectator or parent, I want a mobile-friendly Live Results portal (`/live`) with Division, Class, Gender, and Club filters, plus S3 static JSON export compatibility.
- **Tasks**:
  1. Build `/live` and `GET /api/live/export-json` (matching and extending `LiveResultsPublisher` with both Qualification and Finals brackets).
- **Acceptance Criteria**: Spectators can filter results instantly on mobile, and organizers can export or auto-push `qualificationresults.json`.

### `US-24`: ISK Mobile Bale Tablet ScoreKeeper, QR Setup & Role-Based Auth
- **Story**: As a tournament director, I want archers to score ends on bale tablets (`/isk`) paired via QR code and Bale PIN, while protecting admin routes with Role-Based Access Control (`ADMIN`, `JUDGE`, `TABLET`, `SPECTATOR`).
- **Tasks**:
  1. Add `User`, `IskDevice`, and `IskSubmission` models to `prisma/schema.prisma`.
  2. Build `/isk` mobile keypad/target UI, QR code generator, and role-based middleware.
- **Acceptance Criteria**: Scanning a bale QR code opens `/isk` locked to that bale's archers, submits end scores to the server, and prevents unauthorized edits to tournament settings.
