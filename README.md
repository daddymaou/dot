# Dot

A link-in-bio tool with a portfolio showcase, built in the Swiss / International Typographic style — sharp corners, hairlines, mono annotations, index numbers, and flat colour. No gradients. No shadows. No clutter.

Built with Node.js, Express, MongoDB (Mongoose), and EJS.

## Features

- **One page, everything you are** — links, portfolio, socials assembled on a single public page at `/:username`.
- **Six themes** — `mono`, `paper`, `ink`, `signal`, `terminal`, `cobalt`. Applied across the entire site (landing, dashboard, admin, and public pages) and remembered per visitor via `localStorage` — no account setting needed.
- **Drag-to-reorder links and portfolio** — order is saved automatically.
- **Portfolio showcase** — up to 6 images with optional captions and outbound links.
- **Full dashboard** — manage links, portfolio, profile, avatar, social links, and password.
- **Admin panel** — a real UI at `/admin` for stats, user management, export, logs, and cleanup, backed by the same JSON API.
- **Legal pages + cookie consent** — `/terms`, `/privacy`, `/cookies` with a lightweight, privacy-first consent banner.

## Stack

- **Backend:** Node.js, Express
- **Database:** MongoDB via Mongoose
- **Views:** EJS (server-rendered landing, dashboard shell, public profile pages, legal pages)
- **Auth:** JWT (stored in an `httpOnly` cookie and mirrored to `localStorage` for the dashboard's client-side fetch calls) + bcrypt password hashing
- **Uploads:** Multer with Cloudinary storage (avatars + portfolio images, 2MB max, JPG/PNG/WebP/GIF)
- **Design:** Swiss / International Typographic system, `Archivo` + `IBM Plex Mono` (Google Fonts)

## Project structure

```
dot/
├── server.js              Entry point
├── config/                MongoDB connection, Cloudinary
├── models/                Mongoose schemas (User, Link, Portfolio)
├── routes/                Express routers (auth, user, links, portfolio, admin, public)
├── middleware/            auth.js (JWT guards), upload.js (multer + cloudinary)
├── utils/helpers.js       JWT signing, validation, CSV export, misc helpers
├── views/                 EJS templates
│   ├── partials/          shared <head> and consent banner
│   ├── admin/             admin login + dashboard
│   └── .ejs               index, dashboard, link (public page), 404, terms, privacy, cookies
├── public/
│   ├── css/               design system (style.css) + admin layer (admin.css)
│   ├── js/                script.js (dashboard), admin.js, theme.js, consent.js, reveal.js
│   └── images/            logo, favicon, social icons
└── scripts/seed.js        Creates the initial admin account
```

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env` and adjust as needed:

   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/dot
   JWT_SECRET=change-this-to-something-random
   SESSION_SECRET=change-this-too
   NODE_ENV=development
   BASE_URL=http://localhost:3000
   MAX_PORTFOLIO_ITEMS=6
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123
   ADMIN_EMAIL=admin@maou.name.ng
   ```

   Make sure `JWT_SECRET` and `SESSION_SECRET` are long, random strings before deploying anywhere public.

3. **Start MongoDB**

   Point `MONGODB_URI` at a local instance, a Docker container, or a MongoDB Atlas cluster.

4. **Seed the admin account**

   ```bash
   npm run seed
   ```

   This creates the admin user from your `.env` values (`admin` / `admin123` by default). It's safe to run more than once — it skips creation if the admin already exists.

5. **Run the app**

   ```bash
   npm run dev     # with nodemon, auto-restarts on changes
   # or
   npm start        # plain node
   ```

   Visit `http://localhost:3000`.

## How it works

- **Registration/login** issue a JWT, set as an `httpOnly` cookie and also returned in the response body. The dashboard's client-side JS stores it in `localStorage` and sends it as a `Bearer` token on every `/api/*` call.
- **Username is permanent** — there is no route or UI to change it after registration.
- **Public pages** live at `/:username` (e.g. `/daddymaou`) and are server-rendered from `views/link.ejs`. A list of reserved words (`api`, `admin`, `dashboard`, `terms`, `privacy`, `cookies`, etc.) is blocked from being used as a public page path.
- **Portfolio items are capped at 6** — enforced server-side in `routes/portfolio.js`, not just in the UI.
- **All portfolio and social fields are optional** — a link's title and URL are required, since a link isn't useful without both.
- **Images** are uploaded to Cloudinary (folder `dot`) via Multer; only URLs are stored in the database.

## Theming

The whole interface is driven by CSS custom properties in `public/css/style.css`. Six themes swap the tokens only — none of the layout changes:

| Theme      | Vibe          | Accent       |
|------------|---------------|--------------|
| `mono`     | default       | red `#e4002b` |
| `paper`    | warm paper    | burnt orange  |
| `ink`      | dark          | red           |
| `signal`   | poster yellow | chartreuse    |
| `terminal` | phosphor      | terminal green|
| `cobalt`   | blueprint     | cobalt blue   |

- Theme is stored in `localStorage` under `dot_theme`; a tiny inline script in the `<head>` applies it before first paint (no flash).
- A floating "Theme" switcher (from `public/js/theme.js`) is available on every page.
- Only the session cookie is set by the server; theme and consent preferences stay in the browser.

## Admin panel

The admin UI lives at `/admin` (dashboard) and `/admin/login`. Everything it does is also available as JSON under `/api/admin/*`:

```
POST   /api/admin/login                    admin sign-in
GET    /api/admin/stats                    system-wide stats (incl. chart data)
GET    /api/admin/users                    paginated user list (?page, ?limit, ?q)
GET    /api/admin/users/export             download users as CSV
PUT    /api/admin/users/:id/activate       activate a user
PUT    /api/admin/users/:id/deactivate     deactivate a user
DELETE /api/admin/users/:id                delete a user (and their data)
POST   /api/admin/cleanup                  purge accounts inactive 90+ days
GET    /api/admin/logs                     recent activity logs
PUT    /api/admin/profile                  update admin email
PUT    /api/admin/password                 change admin password
```

## Deployment notes

- Set `NODE_ENV=production` so cookies are marked `secure`.
- Put a real MongoDB URI (e.g. MongoDB Atlas) in `MONGODB_URI`.
- Generate fresh, random values for `JWT_SECRET` and `SESSION_SECRET`.
- Cloudinary credentials currently live in `config/cloudinary.js`. Before deploying anywhere public, move them into environment variables and keep them out of version control.
- Run `npm run seed` again on your production database to create the admin account there.

## License

Proprietary — all rights reserved. This is **not** an open-source project. See [LICENSE](LICENSE).

---

Footer branding (ᗰᗩOᑌ → https://maou.name.ng) appears on the landing page and every public profile page.