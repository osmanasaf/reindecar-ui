# Module 7: Customer Management

## Status: 🟢 Completed

## Rules Compliance
- ✅ `vue-3.md`: Composition API, <script setup>
- ✅ `typescript.md`: Typed data, no any
- ✅ `code-style.md`: No comments

---

## Completed Tasks

- [x] CustomerListView with table
- [x] Search by name/phone/email
- [x] Type filter (Personal/Company)
- [x] Pagination
- [x] CustomerDetailView with sections
- [x] Personal customer info
- [x] Company customer info
- [x] Blacklist handling

---

## Files Created

- `src/views/customers/CustomerListView.vue`
- `src/views/customers/CustomerDetailView.vue`

---

## Features

### List View
- Table layout with avatar
- Type badges (Bireysel, Kurumsal)
- Status (Aktif, Kara Liste)
- Clickable rows

### Detail View
- Contact info section
- Personal info (for PERSONAL type)
- Company info (for COMPANY type)
- Statistics (total rentals, active)
- Blacklist alert

---

## Customer Types

| Type | Badge Color | Label |
|------|-------------|-------|
| PERSONAL | blue | Bireysel |
| COMPANY | purple | Kurumsal |
