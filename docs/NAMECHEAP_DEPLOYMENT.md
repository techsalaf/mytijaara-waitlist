# Deploying MyTijaara Waitlist on Namecheap cPanel shared hosting

This project has two parts:

1. A frontend app built with Vite/TanStack Start
2. A Laravel API for auth, waitlist, admin settings, and other admin features

For Namecheap shared hosting, the most reliable setup is:

- Main domain or subdomain: frontend
- Subdomain: Laravel API
- cPanel MySQL database: app data

> Important: Namecheap shared hosting is good for PHP + MySQL. It is not a great fit for running the full Node/Nitro SSR frontend directly. The safest production setup is to host the frontend as a static bundle or as a simple landing page on cPanel, and host the Laravel API on a subdomain.

---

## Recommended architecture

- Frontend: https://yourdomain.com
- API: https://api.yourdomain.com
- Database: MySQL via cPanel

---

## 1. Prepare your cPanel account

In cPanel, make sure you have:

- PHP 8.2+
- Composer support (if available)
- MySQL database and user
- Addon domain or subdomain for the API

Recommended DNS:

- A record: yourdomain.com -> your hosting IP
- CNAME: api -> yourdomain.com

---

## 2. Create the database

In cPanel:

1. Open MySQL Databases
2. Create a new database, for example: `mytijaara_db`
3. Create a database user and assign it to the database
4. Save the host, username, password, and database name

---

## 3. Deploy the Laravel API

### Option A: Deploy to a subdomain

Create a subdomain such as:

- `api.yourdomain.com`

Set the document root to a folder such as:

- `public_html/api/public`

### Upload the backend files

Upload the contents of the backend folder to that folder, or upload the backend project into a folder and point the subdomain to its `public` directory.

### Configure environment

Copy the example environment file and edit it:

```bash
cp .env.example .env
```

Set values like this:

```env
APP_NAME="MyTijaara"
APP_ENV=production
APP_KEY=base64:YOUR_NEW_KEY
APP_DEBUG=false
APP_URL=https://api.yourdomain.com

FRONTEND_URL=https://yourdomain.com

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=mytijaara_db
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

SESSION_DOMAIN=.yourdomain.com
SANCTUM_STATEFUL_DOMAINS=yourdomain.com,www.yourdomain.com,api.yourdomain.com
```

### Install PHP dependencies

If Composer is available in cPanel terminal or your local machine, run:

```bash
composer install --no-dev
php artisan key:generate
php artisan migrate --force
php artisan db:seed
php artisan storage:link
php artisan config:cache
php artisan route:cache
```

### Set permissions

Make sure these folders are writable:

```bash
chmod -R 755 storage bootstrap/cache
chmod -R 755 public/uploads
```

---

## 4. Deploy the frontend

### Build locally

On your machine, build the frontend with the API URL set to your live API domain:

```bash
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1 npm run build
```

### Upload to cPanel

Upload the generated frontend files to the document root of your main domain, usually:

- `public_html/`

If you are using a static hosting-friendly bundle, upload the built files there.

### Important note for this project

The current app uses a Node/Nitro-based SSR build. Namecheap shared hosting does not provide a reliable runtime for that directly. So for shared hosting:

- use the frontend as a static landing experience, or
- host the frontend on a VPS/Node-compatible host, while keeping the Laravel API on cPanel

If you want the admin panel experience to work fully, the better setup is:

- cPanel for the Laravel API
- a VPS or managed Node host for the frontend

---

## 5. CORS and domain settings

The Laravel backend must allow your live frontend domain.

In the backend config, make sure your allowed origins include:

- https://yourdomain.com
- https://www.yourdomain.com
- https://api.yourdomain.com

You can also set the frontend URL in the backend `.env` file as shown above.

---

## 6. Queue and scheduled tasks

Some admin features may need queues. On shared hosting, queues are usually not kept running continuously. The simplest approach is:

- keep the queue driver as `sync` for basic hosting, or
- run cron jobs if you must use queued jobs later

Example cron job:

```bash
php /home/yourusername/public_html/api/artisan schedule:run >> /dev/null 2>&1
```

---

## 7. Verify the deployment

After deployment:

1. Open https://yourdomain.com
2. Test the waitlist form
3. Test the login flow
4. Test the admin API endpoints at https://api.yourdomain.com/api/v1/...

---

## Best practical recommendation

If you want the least friction on Namecheap shared hosting:

- host the Laravel API on a subdomain
- host the public landing page as static files in the main domain
- keep the admin panel on a VPS or a host that supports Node if you need the full SSR experience

If you want, I can next help you with a ready-to-upload production `.env` file for the backend and a matching frontend build command for your live domain.
