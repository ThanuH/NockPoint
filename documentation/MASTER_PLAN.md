# IANSEO-ON-STEROIDS — Developer Master Plan & Learning Roadmap

Welcome to **`ianso-on-steriods`**! This folder is your workspace to build a modern, production-grade Archery Tournament Management System from scratch while learning full-stack TypeScript, PostgreSQL database modeling, domain-driven rules engines, real-time scoring, and Docker deployment.

---

## 1. Tech Stack You Will Master

| Layer | Technology | What You Will Learn |
| :--- | :--- | :--- |
| **Database** | **PostgreSQL 16** (via Docker) | Relational modeling, composite keys, foreign keys, indexing, ACID transactions |
| **ORM & Migrations** | **Prisma ORM** | Schema design (`schema.prisma`), migrations (`prisma migrate dev`), type-safe queries |
| **Backend & API** | **Next.js (App Router) + TypeScript** | REST Route Handlers (`app/api/.../route.ts`), Server Actions, Zod validation, RBAC Auth |
| **Domain Engine** | **Pure TypeScript (`src/domain/`)** | Arrow encoding, Strategy/Factory patterns for Rulesets, Ranking algorithms, Bracket binary trees |
| **Frontend UI** | **React + Tailwind CSS + Lucide Icons** | Keyboard-first data grids, interactive SVG Target Face spotting, Bracket trees, `@media print` ORIS reports |
| **Deployment** | **Docker & Docker Compose** | Multi-container orchestration (Venue offline server + Cloud Live Results sync) |

---

## 2. Target Project Folder Structure (What You Will Build)

As you progress through the User Stories, you will construct this clean architecture inside `ianso-on-steriods/`:

```text
ianso-on-steriods/
├── MASTER_PLAN.md                  # This roadmap
├── DATABASE_DESIGN.md              # PostgreSQL schema reference & domain guide
├── USER_STORIES.md                 # Complete backlog (US-01 to US-24)
├── docker-compose.yml              # Local PostgreSQL 16 + App container setup
├── prisma/
│   ├── schema.prisma               # Normalized PostgreSQL schema (built incrementally)
│   └── seed.ts                     # Reference data seeder (Grids, Phases, Targets, Presets)
└── src/
    ├── domain/                     # Pure TypeScript Business Logic (Zero UI dependencies)
    │   ├── arrows/                 # Arrow-letter encoding, ring math, SVG hit coordinates
    │   ├── rulesets/               # Pluggable tournament presets (WA, USAA JOAD, Custom Multi-Class)
    │   ├── ranking/                # Category, Event, Shoot-Off, and Team rank calculators
    │   ├── brackets/               # Binary grid math (MatchNo 0..127), Set vs Cumulative progression
    │   └── importers/              # 21-col Ianseo TSV, EventBooking CSV, Cognito Forms parsers
    ├── lib/
    │   ├── db.ts                   # Prisma client singleton
    │   └── auth.ts                 # Role-based access control & Bale Tablet PIN validation
    ├── app/
    │   ├── api/                    # REST Endpoints (tournaments, archers, scoring, finals, isk, tv)
    │   ├── (dashboard)/            # Ianseo-familiar 7-module operator UI
    │   │   ├── competition/
    │   │   ├── participants/
    │   │   ├── qualification/
    │   │   ├── eliminations/
    │   │   ├── finals/
    │   │   └── printouts/
    │   ├── tv/                     # Fault-tolerant Venue TV Display Rotator
    │   ├── live/                   # Public Spectator Live Results Hub
    │   └── isk/                    # Mobile Bale Tablet ScoreKeeper App
    └── components/                 # Reusable UI components (TargetFaceSpotter, ScoreGrid, BracketTree)
```

---

## 3. Epic Breakdown (8 Epics · 24 User Stories)

We will build the application **one User Story at a time**:

- **Epic 1: Foundation, Docker PostgreSQL & Core Tournament Schema (`US-01` – `US-03`)**
  - `US-01`: Project scaffolding, Docker PostgreSQL 16 setup, and Prisma initialization.
  - `US-02`: Core Tournament, Session, Division, Age Class, Distance, and Target Face schema & seeders.
  - `US-03`: Pluggable Ruleset Engine & Competition Setup UI (Create, Open, Edit, Clone, Lock tournaments).
- **Epic 2: Archers, Multi-Age-Category Registrations & Importers (`US-04` – `US-07`)**
  - `US-04`: Normalized `Archer` profile vs. `TournamentRegistration` & `RegistrationCategory` schema (enabling 1 archer to compete in multiple age categories/divisions).
  - `US-05`: Fast Keyboard-First Participant Grid & Multi-Category Registration Form.
  - `US-06`: Unified Importer & Template Generator (21-col Ianseo `.tab`, EventBooking CSV, Cognito Forms).
  - `US-07`: Automated Target Draw (with club-teammate separation) & Accreditation Desk Check-In.
- **Epic 3: Arrow Encoding Engine & Qualification Scoring (`US-08` – `US-11`)**
  - `US-08`: Arrow-Letter Encoding Engine (`A..Z`, `a..z` doubtful stars, dynamic Gold/X-Nine evaluator) + Unit Tests.
  - `US-09`: Normalized Qualification Distance & End Scoring Schema + Standard Score Input Grid.
  - `US-10`: Arrow-by-Arrow Scorecard Editor & Interactive SVG Target Face Spotter.
  - `US-11`: Multi-Category Qualification Ranking Calculator (`CategoryRank` & `SubClassRank`).
- **Epic 4: Championship Events, Shoot-Offs & Automatic Team Builder (`US-12` – `US-14`)**
  - `US-12`: Championship `Events` & `EventClassRule` Mapping Matrix (Individual, Team, Mixed Team).
  - `US-13`: Absolute Event Ranking Calculator & Cutoff Shoot-Off / Coin-Toss Resolution UI.
  - `US-14`: Automatic Team & Custom Club Team Builder + Team Qualification Rankings.
- **Epic 5: Elimination Pool Rounds (`US-15`)**
  - `US-15`: Elimination Round 1 & Round 2 Target Assignment, Scoring, and Advancement.
- **Epic 6: Olympic Matchplay Brackets, Set System & Schedule Conflict Guard (`US-16` – `US-19`)**
  - `US-16`: Binary Bracket Grid (`MatchNo 0..127`) Seeding & Automatic First-Round BYE Advancement.
  - `US-17`: Matchplay Scoring Engine (Set System `2/1/0` vs. Cumulative Score + Shoot-Off Closest-to-Center).
  - `US-18`: Interactive Visual Bracket Tree & Dual SVG Target Spotting Match Editor.
  - `US-19`: Match Schedule Manager with Multi-Age-Category Archer Conflict Detection.
- **Epic 7: Official ORIS & Ianseo Printout Suite (`US-20` – `US-21`)**
  - `US-20`: Start Lists (`C51A`, `C32A`, `C32C`), Scorecards, Back Numbers, Badges, and FOP Layout.
  - `US-21`: ORIS Qualification/Final Result Lists (`C73A`, `C73B`, `C75A`), Medal Standings (`C93`), and Result Book.
- **Epic 8: Fault-Tolerant TV Display, Live Results Hub, ISK Mobile & Auth (`US-22` – `US-24`)**
  - `US-22`: Fault-Tolerant Venue TV Display Rotator (SSE/Polling with zero blank-screen crashes).
  - `US-23`: Public Spectator Live Results Portal & S3 Static JSON Publisher.
  - `US-24`: ISK Mobile Bale Tablet ScoreKeeper, QR Provisioning, and Role-Based Access Control (RBAC).
