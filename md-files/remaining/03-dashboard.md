# Dashboard Upgrade Plan

## Status: 🟢 Implemented

## Objective
Transform the static dashboard into a data-driven command center with charts and actionable insights.

---

## 1. Real Data Integration
Replace hardcoded stats with API calls:
- **Total active rentals**: `rentalsApi.count({ status: 'ACTIVE' })`
- **Vehicles available**: `vehiclesApi.count({ status: 'AVAILABLE' })`
- **Pending payments**: `paymentsApi.count({ status: 'PENDING' })`
- **Returns today**: `rentalsApi.getAll({ endDate: today, status: 'ACTIVE' })`

## 2. Charts & Visualization (Chart.js / ApexCharts)
- [x] **Monthly Revenue Trend**: Line chart showing income over last 6 months.
- [x] **Vehicle Status Distribution**: Doughnut chart (Available vs Rented vs Maintenance).
- [ ] **Top Branches**: Bar chart showing rentals by branch.

## 3. Actionable Widgets
- [x] **Upcoming Returns**: List of vehicles returning today/tomorrow -> "Complete Rental" button.
- [ ] **Pending Approvals**: List of new rental requests -> "Approve/Reject" buttons.
- [ ] **Maintenance Alerts**: Vehicles approaching service KM/Date.

## 4. UI/UX Improvements
- [x] **Skeleton Loading**: Use skeleton screens while fetching dashboard data.
- [ ] **Date Range Picker**: Allow filtering dashboard stats by date range.
- [ ] **Quick Search**: Global search bar in header for Plate/Customer/Contract.

## 5. Implementation Steps
1. [x] Install chart library (`npm install vue-chartjs chart.js`).
2. [ ] Create `DashboardStatsService` to aggregate API data logic.
3. [x] Build `RevenueChart.vue` and `VehicleStatusChart.vue` components.
4. [x] Implement "Upcoming Returns" widget with action buttons.
