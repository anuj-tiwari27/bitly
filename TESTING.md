# Testing Guide – Bitly Platform

This document describes how to test all implemented features.

---

## 1. Automated Unit Tests (pytest)

### Prerequisites
```powershell
pip install -r tests/requirements.txt
# Or: pip install pytest pytest-asyncio httpx bcrypt python-jose qrcode
```

### Run tests
```powershell
# All unit tests
python -m pytest tests/ -v -k "not e2e"

# Specific test files
python -m pytest tests/test_auth.py tests/test_qr_generator.py tests/test_redirect.py -v
```

### Known issues
- Tests require `bcrypt`, `qrcode`, `python-jose` – install from `tests/requirements.txt` or service requirements
- If `/api/organizations` or `/api/roles` returns 404 via frontend, use direct RBAC port: `http://localhost:8001/api/...`
- `test_link_service.py` may need DB – uses `bitly_test` database
- E2E tests require Playwright and running services

---

## 2. Manual API Testing (with Docker running)

Ensure the stack is up: `docker-compose up -d`

### Auth
| Test | Command | Expected |
|------|---------|----------|
| Register (Individual) | `POST /api/auth/register` with `{email, password, account_type:"individual"}` | 201, tokens |
| Register (Organization) | `POST /api/auth/register` with `{email, password, account_type:"organization", organization_name:"Acme"}` | 201, tokens |
| Login | `POST /api/auth/login` with `{email, password}` | 200, access_token |
| Me | `GET /api/users/me` with Bearer token | 200, user object |

### Organizations
| Test | Command | Expected |
|------|---------|----------|
| List orgs | `GET /api/organizations` with Bearer | 200, array |
| Get org | `GET /api/organizations/{id}` with Bearer | 200, org |
| Update org | `PUT /api/organizations/{id}` with `{name, slug, website, industry, team_size}` | 200, updated org |

### Roles (admin/moderator assignment)
| Test | Command | Expected |
|------|---------|----------|
| List roles | `GET /api/roles` with Bearer | 200, array of roles |
| Assign role | `POST /api/users/{userId}/roles` with `{role_id}` (admin only) | 200, user with new role |

### Admin
| Test | Command | Expected |
|------|---------|----------|
| Overview | `GET /api/admin/overview` with admin token | 200, stats |
| Users | `GET /api/admin/users` with admin token | 200, paginated users |
| Organizations | `GET /api/admin/organizations` with admin token | 200, paginated orgs |

### Links, Campaigns, QR, Redirect
| Test | Command | Expected |
|------|---------|----------|
| Create link | `POST /api/links` with `{destination_url, title}` | 201 |
| List links | `GET /api/links` | 200 |
| Redirect | `GET /r/{short_code}` (no auth) | 302 redirect |

---

## 3. Frontend Manual Testing

### URLs (local)
- **App**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Register**: http://localhost:3000/register
- **Admin login**: http://localhost:3000/admin
- **Dashboard**: http://localhost:3000/dashboard (after login)
- **Settings**: http://localhost:3000/dashboard/settings

### Checklist

#### Registration
- [ ] Individual: choose Individual, register → auto org created
- [ ] Organization: choose Organization, fill org name/website/industry/team size → org created

#### Dashboard
- [ ] Create short link
- [ ] Create campaign
- [ ] Generate QR code for link
- [ ] View analytics

#### Settings
- [ ] Profile: edit first/last name, save
- [ ] Organization (if member): edit org name, slug, website, industry, team size
- [ ] Admin (if admin): assign admin/moderator role to user

#### Admin panel (admin only)
- [ ] Login at /admin
- [ ] View platform overview (users, orgs, links, clicks)
- [ ] View users list
- [ ] View organizations list (suspend/activate/delete)
- [ ] View audit logs

#### Removed
- [ ] Organizations page: /dashboard/organizations redirects to /dashboard/settings

---

## 4. Quick API Test (PowerShell)

```powershell
# Login and get token
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body '{"email":"YOUR_EMAIL","password":"YOUR_PASS"}' -ContentType "application/json"
$token = $login.access_token
$headers = @{Authorization="Bearer $token"}

# Test endpoints (use port 8001 for direct RBAC if frontend proxy 404s)
Invoke-RestMethod -Uri "http://localhost:8001/api/users/me" -Headers $headers
Invoke-RestMethod -Uri "http://localhost:8001/api/organizations" -Headers $headers
Invoke-RestMethod -Uri "http://localhost:8001/api/roles" -Headers $headers
```

---

## 5. Service Health Checks

```powershell
Invoke-RestMethod http://localhost:8001/health  # RBAC
Invoke-RestMethod http://localhost:8002/health  # Link
Invoke-RestMethod http://localhost:8005/health  # Redirect
```
