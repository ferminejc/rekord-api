# Rekord — Flutter Build Specification (Full Scope)

> **Prompt for an AI coding agent (e.g., Claude Code).** Build the complete product described below. This is **NOT an MVP** — every feature in this document is in scope, including items the original concept marked "future phase" (wearable integrations, organizer portal, leaderboards, admin tooling). Work phase by phase (§13) and keep the app compiling on **iOS, Android, and Web** at the end of every phase.

---

## 1. Mission

Build **Rekord**, a production-quality running records platform from a **single Flutter codebase** targeting **iOS, Android, and Web**.

Rekord is a lifetime race-history database for the **Philippine running scene**, covering **all distances** — 5K, 10K, half marathon, marathon, ultra, trail, track. Think Athlinks + UltraSignup combined, scoped to the Philippines, with one profile per runner:

- Anyone can search a runner by name and see every race they've ever run.
- Runners can claim their profile, add past races, connect wearables (Strava, Garmin), track PBs and progress over time, set goals, export their data, and compare themselves with other runners.
- Event organizers can publish official results in bulk (CSV or API).
- Admins approve profile claims, resolve disputes, and moderate data.

---

## 2. Fixed technical decisions

Do not substitute alternatives without logging the reason in `DECISIONS.md`.

| Concern | Decision |
|---|---|
| Framework | Flutter (latest stable), Dart 3.x, sound null safety |
| Targets | iOS, Android, Web — all three must build in every phase |
| State management | Riverpod: `flutter_riverpod` + `riverpod_annotation` + `riverpod_generator`. Use `Notifier`/`AsyncNotifier` classes for all business state |
| Routing | `go_router` — named routes, redirect guards, deep links, `usePathUrlStrategy()` on web |
| Networking | `dio` with interceptors: auth header, token refresh-and-retry, logging (debug only) |
| Models | `freezed` + `json_serializable` — immutable entities, sealed unions for failures and UI states |
| Charts | `fl_chart` |
| Skeleton loading | `skeletonizer` — every async content area renders a skeleton of its **real layout** while loading; bare spinners only for buttons, pull-to-refresh, and pagination footers |
| Typography | `google_fonts` — Space Grotesk (display) + Inter (body); tabular figures for all times/paces |
| Local storage | `flutter_secure_storage` (tokens), `hive_ce` (offline cache), `shared_preferences` (lightweight prefs) |
| Media / files | `cached_network_image`, `image_picker` (avatar), `file_picker` + `csv` (organizer bulk upload) |
| Auth UX | Email/password + `google_sign_in` + `sign_in_with_apple`; `flutter_web_auth_2` for Strava/Garmin OAuth |
| i18n | `flutter_localizations` + ARB files (ship English; structure ready for more locales) |
| Lints | `very_good_analysis`; `flutter analyze` must report zero issues at all times |
| Codegen | `build_runner`; commit generated files |

**Market scope: Philippines only.** Rekord covers races held in the Philippines exclusively.

- Every event belongs to a bundled PH location taxonomy — **region → province → city/municipality** (`assets/data/ph_locations.json`, PSGC-based). All location pickers and filters use it; no free-text locations for events.
- **No country filters anywhere** — they are replaced by region/province filters. `nationality` remains a runner attribute (default `PH`) so foreign participants in PH races display correctly.
- All race dates are in **Asia/Manila (UTC+8)**; the app never does timezone conversion.
- Default locale `en_PH`; l10n scaffolded for **Filipino (`fil`)** as the second language.
- Units default to **metric** (km, min/km) — the PH standard; imperial remains an optional toggle.
- Web domain placeholder: `rekord.ph`.

**Backend is out of scope.** The app must be backend-agnostic:

- Code against the REST contract in §10 through repository/data-source abstractions.
- Ship a complete **fake data source** (§10.3) so the entire app runs and demos standalone.
- Switch via `--dart-define=USE_FAKE_API=true` (default **true**).

**App identity:** display name **Rekord** everywhere (launcher label, web `<title>`, About screen). Bundle/application ID placeholder `ph.rekord.app`, defined once and easy to change.

---

## 3. Architecture

Feature-first **Clean Architecture**. Each feature owns three layers:

```
presentation  →  domain  ←  data
(screens,        (entities,     (models/DTOs,
 widgets,         repository     data sources,
 providers)       interfaces,    repository
                  use cases)     implementations)
```

Rules:

1. Dependency direction points inward only. Presentation never imports data-layer classes; both depend on domain.
2. The domain layer is **pure Dart** — no Flutter imports.
3. Repositories return `Result<T>` — a sealed class with `Success(T value)` and `Err(Failure failure)`. No exceptions cross layer boundaries.
4. `Failure` is a freezed union: `NetworkFailure`, `AuthFailure`, `ValidationFailure`, `NotFoundFailure`, `PermissionFailure`, `UnknownFailure`.
5. Every repository implementation is fed by a `DataSource` interface with two implementations: `XRemoteDataSource` (dio, §10 contract) and `XFakeDataSource` (fixtures, §10.3). The choice is made once in DI based on the env flag.
6. Features never import each other's internals. Anything shared is promoted to `core/`.
7. All user-visible strings come from ARB localization files — no hardcoded literals in widgets.

---

## 4. Folder structure

```
rekord/
├── android/
├── ios/
├── web/
├── assets/
│   ├── images/
│   ├── icons/
│   └── data/
│       ├── age_grading_factors.json      # bundled WMA age-grading factor table
│       └── ph_locations.json             # PH regions → provinces → cities (PSGC-based)
├── lib/
│   ├── main.dart                         # entrypoint → bootstrap()
│   ├── bootstrap.dart                    # env, DI, error handling, runApp
│   ├── app.dart                          # MaterialApp.router, theme, l10n
│   ├── core/
│   │   ├── config/
│   │   │   ├── app_config.dart           # env flags (useFakeApi, apiBaseUrl)
│   │   │   └── app_info.dart             # app name, ids, version
│   │   ├── constants/
│   │   │   ├── api_endpoints.dart
│   │   │   └── app_constants.dart        # breakpoints, page sizes, debounce ms
│   │   ├── error/
│   │   │   ├── failure.dart              # freezed Failure union
│   │   │   └── result.dart               # sealed Result<T>
│   │   ├── network/
│   │   │   ├── dio_client.dart
│   │   │   └── interceptors/
│   │   │       ├── auth_interceptor.dart
│   │   │       └── logging_interceptor.dart
│   │   ├── router/
│   │   │   ├── app_router.dart           # GoRouter config + guards
│   │   │   └── route_names.dart
│   │   ├── theme/
│   │   │   ├── app_theme.dart            # Material 3 light + dark
│   │   │   ├── app_colors.dart           # seed + semantic colors
│   │   │   └── app_typography.dart
│   │   ├── utils/
│   │   │   ├── duration_formatter.dart   # HH:MM:SS parsing/formatting
│   │   │   ├── pace_formatter.dart       # min/km ↔ min/mi, unit-aware
│   │   │   ├── distance_formatter.dart
│   │   │   ├── validators.dart
│   │   │   └── extensions/
│   │   └── widgets/                      # shared, feature-agnostic widgets
│   │       ├── adaptive_scaffold.dart    # bottom bar / rail / top nav
│   │       ├── responsive_layout.dart
│   │       ├── app_search_field.dart
│   │       ├── async_value_view.dart     # skeleton / error / data switcher (skeleton builder required)
│   │       ├── empty_state.dart
│   │       ├── error_state.dart
│   │       ├── app_skeleton.dart             # themed Skeletonizer defaults
│   │       ├── nationality_flag.dart
│   │       ├── pace_badge.dart
│   │       └── paginated_list_view.dart
│   ├── features/
│   │   ├── auth/
│   │   │   ├── data/
│   │   │   │   ├── datasources/
│   │   │   │   │   ├── auth_data_source.dart          # interface
│   │   │   │   │   ├── auth_remote_data_source.dart
│   │   │   │   │   └── auth_fake_data_source.dart
│   │   │   │   ├── models/
│   │   │   │   │   ├── user_model.dart
│   │   │   │   │   └── auth_tokens_model.dart
│   │   │   │   └── repositories/
│   │   │   │       └── auth_repository_impl.dart
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── user.dart
│   │   │   │   │   └── auth_tokens.dart
│   │   │   │   ├── repositories/
│   │   │   │   │   └── auth_repository.dart
│   │   │   │   └── usecases/
│   │   │   │       ├── sign_in.dart
│   │   │   │       ├── sign_up.dart
│   │   │   │       ├── sign_in_with_google.dart
│   │   │   │       ├── sign_in_with_apple.dart
│   │   │   │       ├── restore_session.dart
│   │   │   │       └── sign_out.dart
│   │   │   └── presentation/
│   │   │       ├── providers/
│   │   │       │   └── auth_notifier.dart
│   │   │       ├── screens/
│   │   │       │   ├── login_screen.dart
│   │   │       │   ├── sign_up_screen.dart
│   │   │       │   └── forgot_password_screen.dart
│   │   │       └── widgets/
│   │   ├── home/                 # landing: hero search, quick filters, featured
│   │   ├── search/               # runner search + autocomplete + results
│   │   ├── runner_profile/       # profile header, tabs, race table, filters
│   │   ├── race_results/         # result detail, splits, manual entry form
│   │   ├── events/               # race archive, event pages, edition results
│   │   ├── leaderboards/
│   │   ├── stats/                # analytics charts, PB table, age grading
│   │   ├── compare/              # side-by-side runner comparison
│   │   ├── profile_claim/        # claim wizard + claim status
│   │   ├── goals/
│   │   ├── data_export/
│   │   ├── integrations/         # Strava / Garmin connect + import review
│   │   ├── organizer/            # organizer portal, CSV wizard, API keys
│   │   ├── admin/                # claims queue, disputes, moderation, audit
│   │   └── settings/             # units, theme, account, about
│   └── l10n/
│       └── app_en.arb
├── test/                         # mirrors lib/ structure, *_test.dart
│   ├── core/
│   ├── features/
│   └── helpers/                  # fixtures, mocks, pump helpers
├── integration_test/
│   ├── guest_journey_test.dart
│   └── claim_and_add_race_test.dart
├── analysis_options.yaml
├── pubspec.yaml
├── README.md
├── PROGRESS.md                   # phase checklist, maintained by the agent
└── DECISIONS.md                  # assumptions + deviations, maintained by the agent
```

Every feature follows the same `data / domain / presentation` shape shown for `auth`.

---

## 5. Naming conventions

Follow **Effective Dart** plus these project rules:

| Item | Convention | Example |
|---|---|---|
| Files & folders | `snake_case` | `runner_profile_screen.dart` |
| Classes, enums, typedefs, extensions | `UpperCamelCase` | `RaceResultDetailScreen` |
| Variables, functions, parameters, constants | `lowerCamelCase` (constants too, per Effective Dart) | `maxSearchResults` |
| Private members | leading underscore | `_debounceTimer` |
| Screens | suffix `Screen` | `LeaderboardScreen` |
| Reusable widgets | descriptive noun, no suffix | `SplitTable`, `PaceBadge` |
| Domain entities | plain noun | `Runner`, `RaceResult` |
| Data models (DTOs) | suffix `Model`, with `fromJson`/`toJson` + `toEntity()` | `RunnerModel` |
| Repository interface / impl | `XRepository` / `XRepositoryImpl` | `SearchRepository` |
| Data sources | `XDataSource` / `XRemoteDataSource` / `XFakeDataSource` | `EventsRemoteDataSource` |
| Use cases | verb phrase, callable class | `SearchRunners`, `ClaimProfile`, `UploadResultsCsv` |
| Notifiers / providers | `XNotifier`; generated provider `xProvider` | `runnerProfileProvider` |
| Enums | `UpperCamelCase` type, `lowerCamelCase` values | `Terrain.road`, `DistanceCategory.halfMarathon` |
| Route names / paths | name `lowerCamelCase`, path kebab-case & plural | name: `runnerProfile`, path: `/runners/:runnerId` |
| Tests | mirror `lib/` path with `_test.dart` suffix | `test/features/search/domain/usecases/search_runners_test.dart` |
| Assets | `snake_case` in typed folders | `assets/images/logo_rekord.png` |
| Commits | Conventional Commits | `feat(search): add debounced autocomplete` |

---

## 6. Roles & permissions

| Capability | Guest | Runner | Organizer | Admin |
|---|:-:|:-:|:-:|:-:|
| Search runners, view profiles, events, results, leaderboards | ✅ | ✅ | ✅ | ✅ |
| Register / sign in | ✅ | — | — | — |
| Claim an unclaimed profile | | ✅ | | |
| Edit own profile (photo, bio, club, privacy) | | ✅ | | |
| Add past race (manual entry, own profile) | | ✅ | | |
| Request edit / dispute a wrong result | | ✅ | ✅ | ✅ |
| Set goals, export own data | | ✅ | | |
| Connect wearables (Strava, Garmin), auto-import | | ✅ | | |
| Compare runners | ✅ | ✅ | ✅ | ✅ |
| Create/manage events & editions | | | ✅ | ✅ |
| Bulk upload official results (CSV), manage API keys | | | ✅ | ✅ |
| Approve/reject profile claims | | | | ✅ |
| Resolve disputes, edit/remove any result | | | | ✅ |
| Manage users & roles, view audit log | | | | ✅ |

Enforce roles at **both** levels: `go_router` redirect guards for `/organizer/*` and `/admin/*`, and capability checks inside widgets (owner-only buttons, etc.).

---

## 7. Functional requirements — complete feature set

### 7.1 Runner search
- Home hero search field ("Search runners by name…") plus a persistent search destination in the app navigation.
- Autocomplete: triggers at 2+ characters, debounced 300 ms, keyboard-navigable on web; each suggestion shows avatar, name, city/province, and number of events.
- Search filters: **region/province** (PH taxonomy) and **club/team**. Results are paginated — infinite scroll on mobile, pager on desktop.
- Result card: avatar, display name, location, total events; tap → profile.
- Quick distance chips on Home (**5K | 10K | Half | Full | Ultra**) deep-link to the leaderboard pre-filtered to that distance.
- Home also shows **Featured Events** and **Featured Leaderboards** modules.
- Full loading (skeleton), empty ("No runners found for …"), and error (retry) states.

### 7.2 Runner profile
- Header: photo, display name, **verified badge** when identity confirmed, home city/province, club/team, and a nationality flag when the runner is not Filipino.
- Three tabs — **Results | Stats | History**:
  - **Results**: race results table. Columns: Date | Event | Distance | Time | Pace | Rank. Sortable by date/time/distance. Filters: distance category, year, **terrain** (road / trail / track / mixed), **event type** (individual / relay / virtual). Wide screens render a data table; mobile renders result cards. Row tap → Race Result Detail.
  - **Stats**: lifetime summary + analytics (§7.7): total events, total distance, races by distance category (e.g., 5K: 12 · 10K: 7 · Marathon: 4), fastest pace, PB table, charts.
  - **History**: year-by-year timeline — per year: race count, total distance, best result; expandable to that year's races.
- Contextual actions:
  - Owner: **[Add Past Race]** and **[Connect Wearables]** buttons.
  - Visitor on an **unclaimed** profile: **[Claim this profile]** (routes guests to sign-in first).
  - Any registered user: report/dispute action on individual results (§7.9).

### 7.3 Race results database
- Full record schema in §9 — includes event, date, location, distance category **and** exact meters, official time, computed pace, overall/gender/age-group ranks, age group, field size, bib, splits, terrain, event type, `source` (official | manual | import) and `status` (verified | pending | disputed), optional weather and notes.
- **Manual entry** (owner): validated form — event (autocomplete against existing events, or free text), date (not in future), distance (category picker + custom meters), official time (`HH:MM:SS` validated), optional ranks/field size/bib, optional splits (repeatable rows), optional evidence photo. Saves as `source: manual`, `status: pending`, shown with a "pending" badge.
- Official results arrive via the organizer portal (§7.12) as `official/verified`; wearable imports via §7.11 as `import/pending`.

### 7.4 Race result detail
- Header: event name (links to event page), date, location.
- Body: distance, official time, pace, overall rank / age-group rank / gender rank (with field size when known).
- **Splits table** when available: label (5K, 10K, Half…), split time, cumulative time, split pace.
- Optional chips: weather, terrain.
- Source/status badges (official / manual / import · verified / pending / disputed).
- Actions: **[View Full Leaderboard]** → that event edition's results, scrolled/highlighted to this runner; **[Back to Profile]**; report/edit-request for signed-in users.

### 7.5 Race archive & event pages
- `/events`: searchable public archive — query + filters (**year, region/province, distance, terrain**), paginated.
- Event page: name, city · province · region, website link, description, distances offered, list of editions by year ("past years' results").
- Edition results: leaderboard table with filters (distance, gender, age group), in-results name search, pagination.

### 7.6 Leaderboards
- Global page with **All-time | Yearly** toggle (year picker for yearly).
- Required distance selector; filters: **gender, age group** (18–24, 25–29, … 70+), **region**, plus a **Filipino citizens only** toggle (national vs open rankings).
- Row: rank, runner (avatar/name/flag → profile), time, pace, event, date.
- Reused component powers Home's featured leaderboards.

### 7.7 Stats & analytics (profile → Stats tab)
- **PB table** by distance: time, pace, event, date; each links to the result.
- **Yearly mileage** bar chart and **yearly race count** chart.
- **Pace progression** line chart over time, per distance category (selector).
- **Rank progression**: percentile per race (`1 − overallRank / fieldSize`) plotted over time; hidden when field sizes are unknown.
- **Age-graded scores** (toggle): `AG% = worldStandard(age, gender, distance) / athleteTime × 100` using the bundled WMA factor table (`assets/data/age_grading_factors.json`). Show AG% on eligible results and an AG progression chart. Hide gracefully when birth year or gender is missing.
- All charts use `fl_chart`, are theme-aware, and have empty states.

### 7.8 Compare runners
- Entry points: "Compare" action on profiles and direct route `/compare?ids=a,b`.
- Compare 2–4 runners side by side: lifetime stats, PBs per distance (best value highlighted), overlaid pace-progression chart, and a **head-to-head** table of shared events (same event + edition) with each time and the gap.

### 7.9 Accounts, auth & profile claims
- Email/password sign-up with validation + forgot-password flow; Google and Apple sign-in.
- JWT access + refresh tokens in secure storage; dio interceptor auto-refreshes and retries; session restored on launch.
- **Claim flow** (wizard): find own profile → [Claim this profile] → verification method: **email code**, **social-account match**, or **ID document upload** → submit → claim `pending` → admin review (§7.13). On approval: profile marked claimed + verified, user gains owner rights. One active claim per user per profile; a claim-status screen shows progress.
- **Edit requests / disputes**: any registered user can flag a result with proposed corrections + reason; goes to the admin queue; requester sees status.
- Owner profile editing: photo upload, bio, club, home city/province, nationality, gender, birth year, privacy toggles (hide age, hide club).

### 7.10 Goals & data export
- Goal types: target time for a distance, yearly distance, yearly race count. Progress auto-computed from results; status on-track / achieved / missed. Full CRUD.
- Export own race history as **CSV or JSON**, generated client-side — browser download on web, share sheet on mobile.

### 7.11 Integrations — wearables & auto-import
- Providers: **Strava** and **Garmin Connect** via OAuth 2 (`flutter_web_auth_2`). In fake mode, simulate the OAuth round-trip and return sample importable activities.
- Connect screen: provider cards with status (connected / not), connected-since, last sync, **[Sync now]**, disconnect, and an **auto-import** toggle (new race-type activities become `import/pending` results).
- **Import review**: list fetched candidate activities → user selects which to import → map each to an existing event or keep standalone.
- Organizer-platform API imports are server-side; the app surfaces them via source badges.

### 7.12 Organizer portal (role: organizer)
- **My Events**: list / create / edit events (name, city/province/region via the PH taxonomy picker, website, description, distances, terrain) and manage editions (year, date).
- **Bulk results upload wizard** per edition:
  1. Upload CSV (template downloadable in-app; expected columns documented on screen).
  2. Map columns to fields — auto-suggest from headers.
  3. Validation preview: per-row errors (bad time format, missing name, duplicate bib, invalid distance…), with a downloadable error CSV.
  4. Confirm import → summary (imported / skipped counts).
- Imported rows become `official/verified` results; unmatched runners create unclaimed profiles.
- **API keys** screen: create/revoke keys for server-to-server pushes (secret shown once).

### 7.13 Admin panel (role: admin)
- Dashboard: pending claims, open disputes, flagged results counts.
- **Claims queue**: review evidence, approve/reject with a note.
- **Disputes / edit requests**: current vs proposed side by side; apply or reject.
- **Result moderation**: search any result, edit fields, unpublish / soft-delete.
- **User management**: search users, change role (runner / organizer / admin), suspend.
- **Audit log**: chronological, filterable — actor, action, target, timestamp. Every admin mutation writes an entry.
- Desktop-first layout; remains usable on mobile.

### 7.14 Settings & misc
- Units: **metric (default) / imperial** — affects every pace and distance rendering globally.
- Theme: system / light / dark. Language: English / Filipino (stub). About + open-source licenses. Log out. Delete-account request.

---

## 8. Screens & routes

| Path | Screen | Guard |
|---|---|---|
| `/` | Home (hero search, quick distance chips, featured events & leaderboards) | — |
| `/search?q=` | Search results | — |
| `/runners/:runnerId` | Runner profile (tabs: Results, Stats, History) | — |
| `/results/:resultId` | Race result detail | — |
| `/events` | Race archive | — |
| `/events/:eventId` | Event page | — |
| `/events/:eventId/:year` | Edition results / leaderboard | — |
| `/leaderboards` | Global leaderboards | — |
| `/compare?ids=` | Compare runners | — |
| `/login` · `/sign-up` · `/forgot-password` | Auth | redirect away if signed in |
| `/claim/:runnerId` | Claim wizard | auth |
| `/me` | Redirect to own runner profile | auth |
| `/me/claims` | Claim status | auth |
| `/me/add-race` | Manual race entry | auth + owns profile |
| `/me/goals` | Goals | auth + owns profile |
| `/me/integrations` | Wearables (Strava/Garmin) | auth + owns profile |
| `/me/export` | Data export | auth + owns profile |
| `/me/settings` | Settings & profile editing | auth |
| `/organizer` | Organizer dashboard / My Events | role: organizer |
| `/organizer/events/:eventId/upload` | Bulk CSV wizard | role: organizer |
| `/organizer/api-keys` | API keys | role: organizer |
| `/admin` | Admin dashboard | role: admin |
| `/admin/claims` · `/admin/disputes` · `/admin/results` · `/admin/users` · `/admin/audit` | Admin sections | role: admin |

**Adaptive navigation** (`AdaptiveScaffold` in `core/widgets/`):
- `< 600 dp`: bottom `NavigationBar` — Home, Search, Leaderboards, You.
- `600–1023 dp`: `NavigationRail`.
- `≥ 1024 dp` (desktop web): top nav bar with the logo left and Login/Sign Up right (as wireframed); content constrained to max-width 1200, centered.
- Organizer/Admin destinations appear only for those roles.

**Deep linking**: web path URLs work for every route above; configure Android App Links + iOS Universal Links placeholders for `/runners/*`, `/events/*`, `/results/*` (domain placeholder `rekord.ph`).

---

## 9. Domain entities (freezed)

- **Runner** — id, firstName, lastName, displayName, photoUrl?, nationality (default `PH`), city?, province?, region?, club?, gender?, birthYear?, bio?, isClaimed, isVerified, totalRaces, totalDistanceKm, privacy (hideAge, hideClub)
- **RaceResult** — id, runnerId, eventId?, eventName, editionYear, date, location (city, province), distanceCategory, distanceMeters, officialTime (Duration), pacePerKm (computed), overallRank?, genderRank?, ageGroupRank?, ageGroup?, fieldSize?, bibNumber?, splits: List<Split>, terrain, eventType, source (official|manual|import), status (verified|pending|disputed), weather?, notes?, evidenceUrl?
- **Split** — label ("5K"…), distanceMeters, cumulativeTime, splitTime
- **Event** — id, name, slug, city, province, region (PH taxonomy), website?, description?, distances, terrain, organizerId?, logoUrl?, editions: List<EventEdition>
- **EventEdition** — year, date, resultsCount
- **PersonalBest** — distanceCategory, time, pace, eventName, date, resultId
- **LifetimeStats** — totalRaces, totalDistanceKm, racesByCategory (map), fastestPace, pbs: List<PersonalBest>, yearlySummaries: List<YearSummary>
- **YearSummary** — year, raceCount, distanceKm, bestResultId?
- **User** — id, email, displayName, role (runner|organizer|admin), runnerId?, organizerId?, authProviders
- **ProfileClaim** — id, userId, runnerId, method (emailCode|socialMatch|idDocument), evidenceUrl?, status (pending|approved|rejected), submittedAt, reviewedBy?, reviewNote?
- **EditRequest** — id, resultId, requestedBy, proposedChanges (map field→value), reason, status, createdAt
- **LeaderboardEntry** — rank, runnerSummary, time, pace, eventName, date
- **Goal** — id, runnerId, type (targetTime|yearlyDistance|yearlyRaceCount), distanceCategory?, targetValue, deadline?, progress, status
- **Integration** — provider (strava|garmin), status, connectedAt?, lastSyncAt?, autoImportEnabled
- **ImportCandidate** — provider, externalId, name, date, distanceMeters, elapsedTime, selected
- **Organizer** — id, name, website?, verified
- **ApiKey** — id, label, createdAt, lastUsedAt?, revoked
- **AuditLogEntry** — id, actorId, actorName, action, targetType, targetId, details, timestamp

Enums: `DistanceCategory` (fiveK, tenK, halfMarathon, marathon, ultra, custom), `Terrain` (road, trail, track, mixed), `EventType` (individual, relay, virtual), `ResultSource`, `ResultStatus`, `UserRole`, `MeasurementUnit`.

---

## 10. API contract (v1) + fake data

### 10.1 Conventions
Base `/api/v1` · bearer auth · JSON envelope `{ "data": …, "meta": { "page", "pageSize", "total" } }` · errors `{ "code", "message", "fieldErrors"? }`.

### 10.2 Endpoints (implement `RemoteDataSource`s against these)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` · `POST /auth/login` · `POST /auth/social` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/forgot-password` · `POST /me/delete-request` |
| Runners | `GET /runners?q&region&province&club&page` · `GET /runners/suggest?q` · `GET /runners/{id}` · `GET /runners/{id}/results?distance&terrain&eventType&year&sort&page` · `GET /runners/{id}/stats` · `GET /runners/{id}/pbs` · `PATCH /runners/{id}` (owner) · `GET /runners/compare?ids` |
| Results | `GET /results/{id}` · `POST /results` (manual) · `PATCH /results/{id}` (admin) · `DELETE /results/{id}` (admin, soft) · `POST /results/{id}/edit-requests` · `GET /me/edit-requests` |
| Events | `GET /events?q&year&region&province&distance&terrain&page` · `GET /events/{id}` · `GET /events/{id}/editions/{year}/results?distance&gender&ageGroup&q&page` |
| Leaderboards | `GET /leaderboards?distance&scope=allTime|year&year&gender&ageGroup&region&filipinoOnly&page` |
| Claims | `POST /claims` · `GET /me/claims` · `GET /admin/claims?status` · `PATCH /admin/claims/{id}` |
| Goals | `GET/POST /me/goals` · `PATCH/DELETE /me/goals/{id}` |
| Export | `GET /me/export?format=csv|json` |
| Uploads | `POST /uploads` (multipart; `purpose=avatar\|claim_evidence\|result_evidence`) → `{ url }` — referenced by profile PATCH, claims, and manual results |
| Integrations | `GET /me/integrations` · `POST /integrations/{provider}/connect` (returns OAuth URL) · `POST /integrations/{provider}/callback` · `POST /integrations/{provider}/sync` · `POST /integrations/{provider}/import` (selected candidates) · `PATCH /integrations/{provider}` (toggle autoImport) · `DELETE /integrations/{provider}` |
| Organizer | `GET/POST /organizer/events` · `PATCH /organizer/events/{id}` · `POST /organizer/events/{id}/editions` · `POST /organizer/events/{id}/editions/{year}/results/bulk` (multipart CSV → validation report) · `GET/POST/DELETE /organizer/api-keys` |
| Admin | `GET /admin/results?status` · `GET /admin/edit-requests?status` · `PATCH /admin/edit-requests/{id}` · `GET /admin/users?q` · `PATCH /admin/users/{id}` · `GET /admin/audit-log?actor&action&page` |

### 10.3 Fake data source (must make the whole app demoable)
- Deterministic seed (same data every run).
- ≥ 60 runners — predominantly Filipino, with realistic Filipino names and PH running clubs, spread across Luzon/Visayas/Mindanao, plus a handful of foreign participants; mix of claimed/unclaimed, verified/unverified.
- ≥ 25 Philippine events across e.g. Metro Manila/BGC, Cebu, Davao, Baguio (trail), Iloilo, Clark/Pampanga, Subic/Zambales, Camarines Sur, and Bataan; 3–5 editions each; ≥ 800 results across all distance categories, terrains, event types; ~40% with splits; realistic times/paces/ranks/field sizes.
- Seeded accounts for each role: `runner@rekord.ph`, `organizer@rekord.ph`, `admin@rekord.ph` (password `Rekord123!`) — listed on the login screen in fake mode.
- Pending claims, at least one disputed result, organizer events, importable Strava/Garmin candidates.
- Simulated latency 300–700 ms; injectable failure flag to exercise error states.

---

## 11. Cross-cutting quality requirements

- **Responsive**: breakpoints `<600 / 600–1023 / ≥1024`; tables become card lists on mobile; forms max-width on desktop.
- **Theming & visual design**: Material 3 implementing the **Design language** below; light + dark; `ThemeMode.system` default.
- **Async states**: every async content area renders a **skeleton of its real layout** while loading (Skeleton policy below), an actionable empty state, and a retryable error state — orchestrated by `AsyncValueView`, whose skeleton builder is a required parameter.
- **Pagination** on all lists; pull-to-refresh on mobile.
- **Offline**: cache last-viewed profiles/results/events in Hive; show an offline banner and serve cached data when disconnected.
- **Accessibility**: semantic labels, ≥ 4.5:1 contrast, supports 200% text scale, logical focus order on web.
- **Performance**: `const` constructors, builder lists everywhere, cached images, stable 60 fps on mid-range devices.
- **i18n**: every string in ARB; `intl` with the `en_PH` locale for date/number formatting; all race dates rendered as Asia/Manila.
- **Security**: tokens only in secure storage; no secrets committed; UI role checks assume server is the source of truth.

### Design language — "finish-line modern"

The design is grounded in the sport itself: timing clocks, race bibs, splits. Modern, content-first, and deliberately not default-Flutter.

- **Signature element — finish-clock numerals**: race times are the hero. PBs, official times, and result-detail headers are set large in Space Grotesk with tabular figures, styled like a stadium timing display. This one element carries the identity; everything around it stays quiet.
- **Color** (`AppColors`, all swappable): seed `#FF5A1F` energetic orange (CTAs, active states, progress) · ink `#16181D` (dark surfaces / light-mode text) · warm gray `#F6F5F2` (light surfaces) · teal `#0E9384` (verified) · gold `#D4A017` (PB highlights). Status: green verified / amber pending / red disputed. Built on M3 tonal surfaces with subtle 1 px outlines instead of heavy shadows.
- **Typography**: Space Grotesk for display + numerals, Inter for body/UI. All times, paces, and ranks use `FontFeature.tabularFigures()` so columns align perfectly.
- **Shape & spacing**: radius 16 cards / 12 buttons / pill chips; 4-pt spacing scale (4·8·12·16·24·32); generous whitespace.
- **Components**: stat cards for lifetime numbers; **bib-style rank chips** (gold/silver/bronze for top-3); pace badges; segmented buttons for toggles (All-time | Yearly, Metric | Imperial); filters open as a modal bottom sheet on mobile and an inline filter bar on desktop; sticky table headers on web; initials avatar with a deterministic color from the runner's name when no photo.
- **Motion**: restrained — 200–300 ms standard easing; fade-through page transitions; one hero animation (runner avatar, search → profile); charts draw in on first build; shimmer on skeletons. Respect reduced-motion settings.
- **Never ship default-looking Flutter**: no debug banner, custom launcher/web icons (placeholder assets), themed scrollbars on web, no default splash blue.

### Skeleton policy (hard requirement)

- Use `skeletonizer`: wrap the **real layout** in `Skeletonizer(enabled: isLoading)` fed with plausible fake data, so every skeleton automatically mirrors the final UI.
- Bare `CircularProgressIndicator` is allowed **only** for in-flight button states, pull-to-refresh, and pagination footers — never as a full-screen or content-area loader.
- Required skeletons (minimum set): search suggestion rows, search result cards, profile header + lifetime stat cards, race table rows / result cards, result detail + splits table, event page, edition results, leaderboard rows, chart frames, compare columns, goals list, integrations cards, organizer event list, admin queues.
- Shimmer effect is themed once (in `app_skeleton.dart` / `app_theme.dart`) and adapts to dark mode.
- List skeletons render 6–8 placeholder rows sized like real rows.

---

## 12. Testing & quality gates

- **Unit**: duration/pace/distance formatters, age-grading calculator, CSV validator, use cases (mocked repos), notifiers.
- **Widget**: search (debounce/empty/error), profile tabs + filters, splits table, leaderboard filters, claim wizard steps, CSV wizard validation step, and skeleton-loading states for the required-skeleton set (§11).
- **Integration** (`integration_test/`, fake API): guest journey (home → search → profile → result → event leaderboard); auth → claim → add past race journey. Written and run in Phase 9 (requires an emulator/device).
- **Gates at the end of every phase**: `flutter analyze` = 0 issues · `flutter test` green · `flutter build web` succeeds (the compile gate) · `flutter build apk --debug` once Android tooling is installed — CLAUDE.md defines the currently active gate set (build iOS when a macOS toolchain is available).
- Coverage target: ≥ 70% for domain + data layers.

---

## 13. Build plan — execute in order

| Phase | Scope | Exit criteria |
|---|---|---|
| 0 — Foundation | Scaffold project, theme, router + adaptive nav shell, core widgets, `Result`/`Failure`, DI, env flags, fake-API infrastructure, bundled data assets (PH locations, age-grading factors), l10n, lints, CI-ready `analysis_options.yaml` | Themed shell runs on iOS, Android, Web |
| 1 — Guest core | Home, search + autocomplete, runner profile (3 tabs, filters, table/cards), race result detail with splits | Full guest browse journey works on fake data |
| 2 — Events, leaderboards, compare | Archive, event pages, edition results, global leaderboards, compare view, featured modules on Home | All public content reachable & filterable |
| 3 — Auth & settings | Register/login/social, session restore, refresh interceptor, settings (units, theme), profile editing | Role-gated routing works with seeded accounts |
| 4 — Claims & owned data | Claim wizard + status, add past race, edit requests (user side), goals, export | Runner lifecycle complete end-to-end |
| 5 — Analytics | All §7.7 charts + age-graded scoring (bundled factor table) | Stats tab fully populated from fake data |
| 6 — Integrations | Strava/Garmin OAuth flows, sync, import review, auto-import toggle | Simulated connect→sync→import works |
| 7 — Organizer portal | Events/editions management, CSV wizard (map → validate → import), API keys | CSV with seeded errors round-trips correctly |
| 8 — Admin panel | Dashboard, claims queue, disputes, moderation, users, audit log | Approving a seeded claim verifies the profile |
| 9 — Hardening | Responsive/a11y/offline/perf pass, remaining tests to targets, README + screenshots | §14 checklist fully green |

After each phase: run the §12 gates, commit with Conventional Commits, tick `PROGRESS.md`, and log assumptions in `DECISIONS.md`.

---

## 14. Definition of done

- [ ] Every feature in §7 implemented for all four roles — nothing descoped.
- [ ] Philippines-only scoping applied consistently — PH location taxonomy everywhere, no country filters, Asia/Manila dates, `en_PH` locale.
- [ ] Design language (§11) implemented — finish-clock numerals, tokens, tabular figures; no default-looking Flutter UI.
- [ ] Skeleton policy (§11) satisfied — no bare content-area spinners anywhere; the full required-skeleton set exists.
- [ ] All routes in §8 reachable with correct guards on iOS, Android, and Web.
- [ ] Folder structure matches §4; naming matches §5 throughout.
- [ ] `flutter analyze` clean; all tests green; coverage target met.
- [ ] App is fully demoable in fake mode with the seeded role accounts.
- [ ] Real `RemoteDataSource`s implemented against §10 (switchable via `USE_FAKE_API=false`).
- [ ] README covers setup, run commands per platform, env flags, fake↔real API switch, seeded accounts, and test commands.

---

## 15. Working agreements for the agent

1. Read this spec fully before writing code. Do not ask questions — make sensible choices and record them in `DECISIONS.md`.
2. Keep all three platforms compiling at all times; run `build_runner` after model changes and commit generated files.
3. Build in small vertical slices within each phase (screen + state + data + tests together).
4. Never descope silently: anything stubbed gets `// TODO(rekord): …` and a line in `PROGRESS.md`.
5. Prefer composition over inheritance; keep widgets small; extract shared UI into `core/widgets/` only when used by 2+ features.
