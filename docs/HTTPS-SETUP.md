# HTTPS / SSL setup (Namecheap + Let's Encrypt)

This project uses **Traefik** with **Let's Encrypt** to get free SSL certificates. Follow these steps so your site is served over HTTPS.

---

## 1. Point your domain to the server (Namecheap DNS)

Your domain must point to the **public IP** of the VPS where the app runs.

1. Log in to **Namecheap** → **Domain List** → select your domain → **Manage**.
2. Go to **Advanced DNS**.
3. Add or edit **A records**:
   - **Host:** `@` → **Value:** your VPS public IP (e.g. `123.45.67.89`) → **TTL:** Automatic.
   - **Host:** `www` → **Value:** same VPS public IP (or `thelittleurl.com` if you use a CNAME) → **TTL:** Automatic.
4. Remove any conflicting records (e.g. URL Redirect that points www elsewhere).
5. Wait 5–30 minutes for DNS to propagate. Check with:  
   `nslookup thelittleurl.com`  
   You should see your VPS IP.

---

## 2. Set the Let's Encrypt email in Traefik

Let's Encrypt needs an email for expiry notices.

1. Open **`infrastructure/traefik/traefik.yml`**.
2. Find the line:
   ```yaml
   email: admin@thelittleurl.com
   ```
3. Replace it with **your real email** (e.g. `you@thelittleurl.com`).

---

## 3. Use HTTPS URLs in production `.env`

On the server, in your **`.env`** (or environment), set:

```env
NEXTAUTH_URL=https://thelittleurl.com
NEXT_PUBLIC_REDIRECT_URL=https://thelittleurl.com
SHORT_DOMAIN=https://thelittleurl.com/r
```

Use your real domain if it’s different. This avoids mixed-content and redirect issues.

---

## 4. Open ports and deploy

- On the **VPS firewall**, allow **80** (HTTP) and **443** (HTTPS). Let's Encrypt uses port 80 for the HTTP challenge.
- Redeploy so Traefik picks up the new config:
  ```bash
  cd ~/bitly
  git pull
  docker compose down
  docker compose up -d --build
  ```

On first request to **https://thelittleurl.com**, Traefik will request a certificate from Let's Encrypt; it may take a few seconds. HTTP requests will be redirected to HTTPS.

---

## Summary

| Step | Action |
|------|--------|
| **Namecheap** | A record for `@` and `www` → VPS public IP |
| **Traefik** | Set `email` in `infrastructure/traefik/traefik.yml` |
| **Server .env** | Use `https://` for `NEXTAUTH_URL`, `NEXT_PUBLIC_REDIRECT_URL`, `SHORT_DOMAIN` |
| **Firewall** | Allow ports 80 and 443 |
| **Deploy** | `docker compose up -d --build` |

No SSL configuration is required in Namecheap; certificates are issued and renewed automatically by Let's Encrypt via Traefik.
