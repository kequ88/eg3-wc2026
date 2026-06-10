# Elmina Green Three — World Cup 2026 Predictor ⚽

A neighbourhood prediction tournament app for EG3 residents.
Built with Vite + Firebase Firestore + Netlify.

---

## Project Structure

```
eg3-wc2026/
├── index.html                  # App shell — no secrets, no logic
├── vite.config.js              # Vite build config
├── package.json                # Dependencies
├── netlify.toml                # Netlify build & deploy config
├── .env.example                # Secret template (safe to commit)
├── .env                        # Your real secrets (NEVER commit)
├── .gitignore                  # Excludes .env, node_modules, dist
└── src/
    ├── main.js                 # Entry point — wires everything
    ├── config/
    │   └── firebase.js         # Firebase init (reads from .env)
    ├── data/
    │   ├── teams.js            # 48 qualified nations
    │   └── houses.js           # Valid house numbers per lane
    ├── services/
    │   ├── firestore.js        # All Firestore read/write ops
    │   ├── openfootball.js     # Live match data + parser + sim mode
    │   ├── analytics.js        # GA4 event tracking
    │   └── image.js            # Client-side image compression
    ├── scoring/
    │   └── engine.js           # Pure scoring logic (no DOM/Firebase)
    ├── ui/
    │   ├── tabs.js             # Tab switching + deadline banner
    │   ├── splash.js           # Rules splash + rules tab content
    │   ├── picks.js            # Pick form (steps 1–3)
    │   ├── leaderboard.js      # Leaderboard + round tabs
    │   ├── profile.js          # Profile page + breakdown table
    │   └── teams-page.js       # Teams tab (all 48 nations)
    └── styles/
        ├── main.css            # Variables, reset, global layout
        ├── components.css      # Buttons, grids, badges, avatars
        ├── leaderboard.css     # Board cards + profile page
        └── teams.css           # Teams page + rules + splash
```

---

## Prerequisites

- Node.js v18 or later (`node --version`)
- npm v9 or later (`npm --version`)
- A Google account (for Firebase + Netlify)
- A GitHub account

---

## Step 1 — Clone the repo

```bash
git clone https://github.com/kequ88/eg3-wc2026.git
cd eg3-wc2026
```

---

## Step 2 — Install dependencies

```bash
npm install
```

This downloads Vite and Firebase into `node_modules/`.
Takes about 30 seconds. Never commit `node_modules/`.

---

## Step 3 — Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` in any text editor. You will fill in the values in Steps 4 and 5.

---

## Step 4 — Create a Firebase project

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"**
3. Name: `elmina-green-three-wc2026`
4. Disable Google Analytics → click **"Create project"**

### Create Firestore database

1. Left sidebar → **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"**
4. Region: **asia-southeast1** (Singapore — closest to Malaysia)
5. Click **"Enable"**

### Set Firestore security rules

1. In Firestore → **Rules** tab
2. Replace ALL existing content with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /picks/{houseId} {
      allow read:   if true;
      allow create: if true;
      allow update: if true;
      allow delete: if false;
    }
  }
}
```

3. Click **"Publish"**

### Get your Firebase config

1. Project Overview → click **`</>`** (Web icon)
2. App nickname: `EG3 Predictor`
3. Do NOT enable Firebase Hosting (we use Netlify)
4. Click **"Register app"**
5. Copy the values from the `firebaseConfig` object into your `.env`:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## Step 5 — GA4 is already configured

Your GA4 Measurement ID (`G-5S676SZZLD`) is already hardcoded in `index.html`.
No action needed — it just works.

---

## Step 6 — Run locally

```bash
npm run dev
```

Opens at **http://localhost:5173**

You should see the app with the rules splash screen.
Test a pick submission — it should save to your Firebase Firestore.

### Test simulation mode

To see scoring without waiting for real matches:

1. Open `src/services/openfootball.js`
2. Change `export const SIM_MODE = false;` to `true`
3. Edit `SIM_TEAMS` to use team names from your actual Firestore picks
4. Save — the leaderboard will show simulated scores instantly
5. **Set back to `false` before deploying to production**

---

## Step 7 — Push to GitHub

Make sure `.env` is in `.gitignore` (it already is).

```bash
git add .
git commit -m "Initial structured app"
git push origin main
```

GitHub will warn you if it detects any secrets. If it does,
check that `.env` is listed in `.gitignore` and was never staged.

---

## Step 8 — Deploy to Netlify

### Connect your repo

1. Go to **https://app.netlify.com**
2. Click **"Add new site" → "Import an existing project"**
3. Choose **GitHub** → authorise Netlify → select `kequ88/eg3-wc2026`
4. Build settings are auto-detected from `netlify.toml`:
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
5. Click **"Deploy site"**

### Add your Firebase secrets to Netlify

This is the key step — Netlify injects these at build time
so the secrets never live in your repo.

1. Netlify dashboard → your site → **Site configuration → Environment variables**
2. Click **"Add a variable"** for each of the following:

| Key | Value |
|-----|-------|
| `VITE_FIREBASE_API_KEY` | your API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | your auth domain |
| `VITE_FIREBASE_PROJECT_ID` | your project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | your storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | your sender ID |
| `VITE_FIREBASE_APP_ID` | your app ID |

3. After adding all variables → **Deploys → Trigger deploy → Deploy site**

Your site will be live at: `https://your-site-name.netlify.app`

### Set a custom subdomain (optional)

1. Netlify → **Domain management → Options → Edit site name**
2. Change to something like `eg3-wc2026` or `elmina-green-three`
3. Your URL becomes: `https://eg3-wc2026.netlify.app`

---

## Ongoing workflow

Every time you push to `main`, Netlify automatically rebuilds and deploys.

```bash
# Make a change
git add .
git commit -m "Fix scoring bug"
git push origin main
# Netlify builds and deploys automatically — takes ~1 minute
```

---

## Simulation mode reminder

Before the tournament starts, always verify:

```bash
grep "SIM_MODE" src/services/openfootball.js
# Should output: export const SIM_MODE = false;
```

---

## Scoring rules summary

| Event | Points |
|-------|--------|
| Submitting picks | +5 |
| Team passes group stage | +1 |
| Team reaches R16 / QF / SF / Final / Wins | +2 / +3 / +4 / +6 / +10 |
| Group stage win | +3 per match |
| Group stage draw | +1 per match |
| Knockout win | +5 per match |
| Wrong pick — exits group | −3 to −5 |

Full rules in the app → 📋 Rules tab.

---

## Tech stack

| Tool | Purpose |
|------|---------|
| [Vite](https://vitejs.dev) | Build tool + dev server |
| [Firebase Firestore](https://firebase.google.com) | Database (picks storage) |
| [openfootball](https://github.com/openfootball/worldcup.json) | Free match results API |
| [Google Analytics 4](https://analytics.google.com) | Visitor & event tracking |
| [Netlify](https://netlify.com) | Hosting + CI/CD |
| [GitHub](https://github.com) | Source control |

---

*Built for Elmina Green Three, Shah Alam — World Cup 2026* 🇲🇾⚽
