# Module 13: Settings & Reports

## Status: 🔴 Pending

## Overview
Sistem ayarları ve raporlar.

---

## Tasks

- [ ] 13.1 Create SettingsView
- [ ] 13.2 Create settings store
- [ ] 13.3 Create ThemeToggle
- [ ] 13.4 Create ProfileForm
- [ ] 13.5 Create NotificationPrefs
- [ ] 13.6 Create ReportsView (basic)
- [ ] 13.7 Persist settings to localStorage

---

## Pages

| Route | Component |
|-------|-----------|
| `/settings` | SettingsView |
| `/settings/profile` | ProfileView |
| `/settings/notifications` | NotificationSettingsView |
| `/reports` | ReportsView |

---

## Settings Store

```typescript
interface SettingsState {
  theme: 'light' | 'dark'
  sidebarCollapsed: boolean
  notificationPrefs: NotificationPrefs
}
```

---

## Dependencies
- **Requires**: Module 3 (Auth)
