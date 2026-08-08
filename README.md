# Dot

A minimal, black-and-white link-in-bio tool with a portfolio showcase. Built with Node.js, Express, MongoDB (Mongoose), and EJS.

## Stack

- **Backend:** Node.js, Express
- **Database:** MongoDB via Mongoose
- **Views:** EJS (server-rendered landing, dashboard shell, public profile pages)
- **Auth:** JWT (stored in an httpOnly cookie and mirrored to `localStorage` for the dashboard's client-side fetch calls) + bcrypt password hashing
- **Uploads:** Multer (avatars + portfolio images, 2MB max, JPG/PNG/WebP/GIF)

## Project structure

```
dot/
├── server.js              Entry point
├── config/db.js           MongoDB connection
├── models/                Mongoose schemas (User, Link, Portfolio)
├── routes/                Express routers (auth, user, links, portfolio, admin, public)
├── middleware/             auth.js (JWT guards), upload.js (multer config)
├── utils/helpers.js        JWT signing, validation, CSV export, misc helpers
├── views/                  EJS templates (index, dashboard, link, 404)
├── public/                 CSS, client JS, images, and uploaded files
└── scripts/seed.js         Creates the initial admin account
```

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env` (a `.env` is already included with sane local defaults) and adjust as needed:

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

- **Registration/login** issue a JWT, set as an httpOnly cookie and also returned in the response body. The dashboard's client-side JS stores it in `localStorage` and sends it as a `Bearer` token on every `/api/*` call.
- **Username is permanent** — there is no route or UI to change it after registration.
- **Public pages** live at `/:username` (e.g. `/daddymaou`) and are server-rendered from `views/link.ejs`. A short list of reserved words (`api`, `admin`, `dashboard`, etc.) is blocked from being used as a public page path.
- **Portfolio items are capped at 6** — enforced server-side in `routes/portfolio.js`, not just in the UI.
- **All portfolio and link fields are optional** except a link's title and URL, since a link isn't very useful without both.
- **File uploads** are stored under `public/uploads/<username>/` and served statically.

## Admin panel

There's no separate `/admin` view in this build — the admin routes are pure JSON APIs under `/api/admin/*` (login, list/search/export users, activate/deactivate, delete, cleanup inactive accounts, stats, logs, and admin profile/password management). Wire these up to any front end you like, or drive them directly with `curl`/Postman. See `GUIDE.txt` for example requests.

## Deployment notes

- Set `NODE_ENV=production` so cookies are marked `secure`.
- Put a real MongoDB URI (e.g. MongoDB Atlas) in `MONGODB_URI`.
- Generate fresh, random values for `JWT_SECRET` and `SESSION_SECRET`.
- Uploaded files are stored on local disk under `public/uploads/`. If you deploy somewhere with an ephemeral filesystem (e.g. most PaaS free tiers), swap the Multer disk storage for S3/Cloudinary/etc. before going live.
- `npm run seed` again on your production database to create the admin account there too.

## Design system

- Pure black (`#000000`) and white (`#ffffff`), with grays for secondary text and borders.
- `border-radius: 0` everywhere — no rounded corners, anywhere, ever.
- The only color accent is blue (`#3b82f6`) on hover/focus states.
- Font: Inter, loaded from Google Fonts.

---

Footer branding (ᗰᗩOᑌ → https://maou.name.ng) appears on both the landing page and every public profile page.
