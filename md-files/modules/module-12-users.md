# Module 12: User Management (Admin)

## Status: 🔴 Pending

## Overview
Kullanıcı yönetimi (sadece Admin).

---

## Tasks

- [ ] 12.1 Create UserListView
- [ ] 12.2 Create UserDetailView
- [ ] 12.3 Create UserForm
- [ ] 12.4 Create user store
- [ ] 12.5 Create RoleBadge
- [ ] 12.6 Create PasswordChangeForm
- [ ] 12.7 Add admin-only route guard

---

## Pages (Admin Only)

| Route | Component |
|-------|-----------|
| `/users` | UserListView |
| `/users/new` | UserFormView |
| `/users/:id` | UserDetailView |

---

## User Roles

| Role | Permissions |
|------|-------------|
| ADMIN | Full access |
| OPERATOR | CRUD except users |

---

## Dependencies
- **Requires**: Module 3 (Authentication)
