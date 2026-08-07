# FoodBill POS

A mobile-first billing app for tea shops, cafes, bakeries, and small food
businesses. Built with React + Vite, Firebase (Auth + Firestore), Cloudinary,
and a UPI QR checkout — designed so a full sale takes under 10 seconds.

## What's implemented

- **Auth** — Google sign-in only, one Google account per shop. First sign-in
  auto-provisions that account's shop (no manual Firestore setup, no
  separate signup form). No admin/cashier split — the signed-in account has
  full access to its own shop and nothing else.
- **Billing** (the main screen) — live product grid with search/category
  filter, one-tap add-to-cart, quantity controls, hold/recall bill,
  discount (flat or %), per-item GST, round-off, optional customer details,
  cash/UPI/card/split payment, dynamic UPI QR, invoice generation for
  58mm / 80mm / A4, print (`react-to-print`), WhatsApp share.
- **Inventory** — dashboard (total products/categories/low stock/out of
  stock), add/edit/delete products with Cloudinary image upload, categories,
  search, sort, pagination.
- **Reports** — today/week/month/year + custom date range, total orders,
  average/highest/lowest sale, sales trend chart, hourly sales,
  payment-method split (split bills broken into their real cash/UPI/card
  components), category-wise sales, top customers, top/least selling
  products, CSV export.
- **Settings** — shop details + logo, invoice settings (prefix, footer,
  paper size, what shows on the printed bill), payment settings (Dynamic UPI
  QR or an uploaded Static QR image), printer preferences, theme toggle,
  backup/restore (JSON export of products/categories/customers/orders),
  signed-in account info + sign out.
- PWA-ready (installable, offline app shell, Cloudinary image caching),
  lazy-loaded routes, memoized product cards, Firestore pagination.

## Auth & data model (v3)

- `shopId` is always the signed-in Google account's own Firebase Auth
  `uid` — there is no separate `/users` collection and no role field.
  `authService.signInWithGoogle()` calls
  `settingsService.ensureShopProvisioned()`, which creates
  `/shops/{uid}/settings/general` with sensible defaults the first time
  that account ever signs in. Every sign-in after that is a no-op.
- Firestore rules collapse to one check:
  `request.auth.uid == shopId` — see `firestore.rules`. An account can only
  ever read or write its own shop's subtree.
- If you later want to let an owner invite staff to their *same* shop
  (rather than one account per shop), that's a deliberate follow-on
  feature — it means re-introducing a role field and changing the rule
  from "uid == shopId" to "uid is listed as a member of shopId". Worth
  doing as its own step rather than half-building it now.

## Mobile & UX pass (v2)

- **Popups** close on backdrop tap, Esc key, or the (now larger, sticky) X
  button; long content scrolls inside the popup instead of overflowing the
  screen.
- **Image uploads** (product photos, shop logo, static QR) upload
  immediately with a live progress ring, drag-and-drop, remove/replace, and
  file-size/type validation — instead of silently uploading at Save time.
- **UPI QR** now supports both **Dynamic** (auto-fills the exact bill
  amount) and **Static** (upload your bank's own QR image) modes, chosen in
  Settings → Payment. The dynamic QR can be downloaded as a PNG or its UPI
  ID copied with one tap.
- **Sales Reports** now include a category-wise sales chart, a top-customers
  panel, a custom date-range picker alongside the presets, and correctly
  split "split payment" bills into their real cash/UPI/card components
  instead of counting them as one lump sum.
- **Mobile layout**: the cart is a floating "View Cart · ₹total" bar plus a
  full-screen drawer on phones (a fixed sidebar wasn't usable on a small
  screen), heights use `100dvh` instead of `100vh` so the layout doesn't
  jump when the browser's address bar shows/hides, the bottom nav and
  checkout button respect `env(safe-area-inset-bottom)` for the iPhone home
  indicator, and all form inputs are forced to 16px on small screens so iOS
  Safari doesn't auto-zoom on focus.

## What's intentionally left as a next step

- **Tamil translations** — the language selector saves a preference, but no
  screen text is routed through a translation table yet (recommend
  `react-i18next` with a `src/locales/{en,ta}.json` pair).
- **Bluetooth/USB printer pairing** — printing goes through the browser's
  native print dialog, which works with any printer already set up at the
  OS level (including paired Bluetooth thermal printers). Direct
  Web Bluetooth ESC/POS printing (bypassing the print dialog entirely) is a
  meaningful separate feature — happy to add it next if you tell me your
  printer model.
- **Multi-staff shops** — see "Auth & data model" above; today it's strictly
  one Google account per shop.
- Excel (`.xlsx`) and PDF report export — CSV export is done; the `xlsx`
  library can be dropped in for the other two formats.

## Setup

1. **Firebase**
   - Create a project at console.firebase.google.com.
   - **Authentication → Sign-in method → enable Google.** Set a support
     email when prompted. (You do not need to enable Email/Password.)
   - **Authentication → Settings → Authorized domains** — add your dev/prod
     domains (`localhost` is included by default).
   - Enable **Firestore** (production mode).
   - Copy your web app config into `.env` (see `.env.example`).
   - Deploy rules & indexes: `firebase deploy --only firestore`.
   - That's it — no manual user or shop document needed. The first time you
     click "Continue with Google" in the app, your shop is created
     automatically under `/shops/{your-uid}`.

2. **Cloudinary**
   - Create a free account, note your **cloud name**.
   - Settings → Upload → add an **unsigned** upload preset, note its name.
   - Put both into `.env`.

3. **Install & run**
   ```bash
   npm install
   cp .env.example .env   # then fill in your values
   npm run dev
   ```

4. **Deploy**
   ```bash
   npm run build
   firebase deploy --only hosting,firestore
   # or: vercel deploy
   ```

## Folder structure

```
src/
├── components/
│   ├── common/         # Button, Input, Modal, Spinner
│   ├── billing/         # ProductGrid, Cart, PaymentModal, Invoice, UpiQr...
│   └── inventory/       # ProductFormModal
├── pages/               # Login, Billing, Inventory, Reports, Settings
├── layouts/             # MainLayout (bottom nav)
├── hooks/               # useAuth, useProducts, useShopSettings
├── services/            # authService, productService, orderService,
│                        # cloudinaryService, reportService, settingsService
├── firebase/            # config.js, collections.js
├── store/               # authStore, cartStore (persisted), uiStore
├── routes/              # ProtectedRoute, AppRoutes
└── utils/               # billing math, UPI link builder, invoice numbering
```

## Security note

Firebase web API keys are not secret in the way a server key is — they're
meant to travel in client bundles — but access is controlled by the
Firestore rules in `firestore.rules`, which this project deploys and
enforces. Still, it's good practice to restrict the API key to your own
domains in Google Cloud Console → Credentials.
