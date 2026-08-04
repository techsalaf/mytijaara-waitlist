# Vercel deployment guide for mytijaara.com

## Goal

Serve the public waitlist/frontend at mytijaara.com using Vercel, while the Laravel API runs on a subdomain such as api.mytijaara.com.

## Recommended DNS setup

On Namecheap, point your domain like this:

- A record for mytijaara.com -> Vercel IPs or use the Vercel nameservers if you prefer
- CNAME for www -> cname.vercel-dns.com
- CNAME for api -> your backend host, or use a separate host if you deploy the API elsewhere

If you want to keep the current Namecheap hosting for the API, use:

- mytijaara.com -> Vercel frontend
- api.mytijaara.com -> your Namecheap cPanel subdomain or other backend host

## Vercel project setup

1. Open Vercel
2. Import the GitHub repo
3. Choose the repository root
4. Set the framework to Vite
5. Use build command:

```bash
npm run build:vercel
```

6. Set environment variable:

```bash
VITE_API_BASE_URL=https://api.mytijaara.com/api/v1
```

## Backend setup

Deploy the Laravel backend from the backend folder to a host that supports PHP/MySQL, such as:

- Namecheap shared hosting
- Railway
- Render
- Laravel Vapor

Set the environment values:

```env
APP_URL=https://api.mytijaara.com
FRONTEND_URL=https://mytijaara.com

DB_CONNECTION=mysql
DB_HOST=...
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...
```

Also make sure CORS allows the Vercel frontend origin:

- https://mytijaara.com
- https://www.mytijaara.com

## Final flow

- Users visit mytijaara.com
- The landing page and waitlist run on Vercel
- API requests go to api.mytijaara.com

This is the cleanest deployment path for your domain and hosting setup.
