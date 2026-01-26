# Form Validations Plan

## Status: 🟡 Planned

## Objective
Implement comprehensive validation logic using `useValidation` composable across all data entry forms to ensure data integrity before API submission.

---

## 1. Customer Form Validation

### Personal Customer
- **TCKN**: `rules.tckn()` (Algorithm check + 11 digits)
- **Phone**: `rules.phone()` (05XX... format)
- **Email**: `rules.email()`
- **License Class**: `rules.required()`
- **Birth Date**: `rules.required()` + `18+ age check`

### Company Customer
- **Tax Number**: `rules.taxNumber()` (10-11 digits)
- **Company Name**: `rules.required()`
- **Authorized Person**: `rules.required()`
- **Phone**: `rules.phone()`

## 2. Vehicle Form Validation

### Vehicle Details
- **Plate**: `rules.plate()` (Regex: `34 ABC 123`)
- **VIN**: `rules.vin()` (17 chars)
- **Year**: `rules.yearRange(2000, currentYear)`
- **KM**: `rules.minValue(0)`
- **Daily Price**: `rules.positive()`

## 3. Implementation Steps

1. [ ] Update `CustomerDetailView.vue` (or Create/Edit modal) with real-time validation.
2. [ ] Update `VehicleDetailView.vue` (or Create/Edit modal).
3. [ ] Add `touched` state handling to show errors only after interaction.
4. [ ] Disable submit buttons when forms are invalid. 
