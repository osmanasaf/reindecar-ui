# Vehicle API Frontend Plan

## Phase 1 - Contracts (Types + API)
- Update request/response contracts for vehicle base update.
- Add explicit API support for both `PATCH /vehicles/{id}` and `PUT /vehicles/{id}`.

Acceptance Criteria:
- `UpdateVehicleRequest` includes `registrationDate`, nullable pricing/date/text fields, and strict fuel/transmission types.
- Vehicle response type includes nullable `categoryName` and `branchName`.
- `vehiclesApi` exposes both `patchById` and `putById`.

## Phase 2 - Application Layer (Vehicle Forms)
- Align create/edit flows to send backend-compatible payloads.
- Enforce update KM floor using existing vehicle KM value.
- Handle branch-status business error with user-facing message.

Acceptance Criteria:
- Update requests from `VehicleFormView` and `VehicleEditModal` include full update payload shape.
- Edit mode blocks `currentKm` lower than original vehicle KM in UI validation.
- Branch change business rejection shows `Branch can only be changed when vehicle is AVAILABLE`.

## Phase 3 - Presentation Layer (Vehicle Screens)
- Use resolved `branchName`/`categoryName` from vehicle response directly.
- Remove client-side fallback fetches for branch/category names.

Acceptance Criteria:
- Vehicle detail/list screens render names from response without extra branch/category lookup calls.
- Existing vehicle list/detail behavior remains functional.

## Phase 4 - Verification
- Run type/build validation for integration safety.

Acceptance Criteria:
- `npm run build` completes successfully.
