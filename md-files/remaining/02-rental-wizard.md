# Rental Wizard Logic Plan

## Status: 🟡 Planned

## Objective
Replace placeholder inputs in `RentalCreateView` with fully functional selection logic.

---

## 1. Vehicle Selection (Step 2)
### Requirements
- Show only **AVAILABLE** vehicles.
- Filter by **Date Range** (already rented vehicles in that range should be excluded).
- Search by Brand/Model/Class.

### Implementation
- [ ] **VehicleSelector.vue**: Reusable component.
- [ ] **API**: `vehiclesApi.getAvailable({ startDate, endDate })`.
- [ ] **UI**: Grid view with photos and "Select" button.

## 2. Customer Selection (Step 3)
### Requirements
- Search by Name/Phone/TCKN.
- "Quick Create" button for new customers without leaving wizard.
- Display warning if customer has unpaid debts or blacklist status.

### Implementation
- [ ] **CustomerSelector.vue**: Autocomplete search input.
- [ ] **Quick Create Modal**: Minimal form for new customer.
- [ ] **Validation**: Block selection if customer is blacklisted.

## 3. Pricing Calculation (Step 4)
### Requirements
- Calculate total days.
- Apply seasonal rates or campaign discounts.
- Show breakdown: `(Daily Rate * Days) + Extras - Discount`.

### Implementation
- [ ] **PricingService**: Logic for calculation.
- [ ] **API check**: Validate final price with backend before submit.

## 4. Implementation Steps
1. [ ] Create `VehicleSelector` component with availability filter.
2. [ ] Create `CustomerSelector` with search.
3. [ ] Integrate into `RentalCreateView` wizard steps.
4. [ ] Implement dynamic price calculation watcher.
