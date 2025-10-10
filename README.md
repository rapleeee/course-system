# Mentora Course System

Mentora Course System is the official learning platform for Mentora SMK Pesat. It combines a student-facing learning experience with an admin console, subscription payments, certificate automation, and an AI-powered mentor that guides learners through their study plans.

## Features
- Student dashboard with course progress, streaks, announcements, and quick recommendations sourced from Firestore.
- Course catalog, chapter management, and assignment workflows, including DOCX template import and rubric-based review.
- Subscription and payment flows with Midtrans Snap and manual bank transfer instructions.
- Certificate generation pipeline that renders signed PDFs, stores them in Firebase Storage, and notifies students automatically.
- MentorAI chat widget backed by Together API / HuggingFace for warm guidance and a WhatsApp escalation path.
- Community tooling: event calendar, forum, leaderboard, surveys, and gamified streak tracking.
- Admin workspace to manage courses, users, announcements, events, subscriptions, and certificate issuance.
- Progressive Web App support with offline fallback and service worker registration guards.

## Tech Stack
- Next.js 15 (App Router) with React 19 and TypeScript.
- Tailwind CSS v4 for styling and component primitives via Radix UI plus custom UI kit.
- Firebase (Auth, Firestore, Storage) on the client and Firebase Admin SDK on the server.
- Midtrans Snap integration for payments and manual bank transfer helpers.
- PDFKit, QRCode, and docx parser utilities for certificates and assignment imports.
- TanStack Table, Framer Motion, lucide icons, Sonner toasts, and supporting libraries.

## Project Structure
```text
src/
  app/            # Next.js routes (student pages, admin area, APIs, marketing pages)
  components/     # Layouts, feature widgets, MentorAI chat, reusable UI
  data/           # Static datasets such as learning paths
  hooks/          # Shared React hooks (e.g., Firebase auth)
  lib/            # Firebase clients, certificate generator, AI client, utilities
  types/          # Centralised TypeScript types
scripts/
  verify-docx-import.cjs  # Smoke test for DOCX assignment parser
public/
  manifest.json, offline.html, images, icons, etc.
```

## Getting Started
1. Install Node.js 18 or newer (Next.js 15 requires modern Node features).
2. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env.local` (create it if it does not exist) and populate the environment variables described below.
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000` in your browser.

## Available Scripts
- `npm run dev` — start the application in development mode.
- `npm run build` — create a production build.
- `npm run start` — serve the production build.
- `npm run lint` — lint the project with ESLint / Next.
- `npm run verify:docx-import` — generate a sample DOCX in memory and ensure the assignment parser returns the expected questions; helpful after touching `src/lib/assignments/docx-import.ts`.

## Environment Variables
Create a `.env.local` file (not committed to Git). The variables are grouped by responsibility below.

### Firebase (client runtime)
| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase web API key for the Mentora project. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain (e.g., `project-id.firebaseapp.com`). |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Storage bucket name (e.g., `project-id.appspot.com`). |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase web app ID. |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | No | Optional Analytics measurement ID. |

### Firebase Admin (server runtime)
You may provide **one** of the following credential sets:
- `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service-account JSON file path, or
- `FIREBASE_SERVICE_ACCOUNT_KEY` containing the JSON string of the service account, or
- The triplet `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (use escaped `\n` for line breaks in the key).

Additional Firebase admin variables:
| Variable | Required | Description |
| --- | --- | --- |
| `FIREBASE_PRIVATE_KEY` | Yes\* | Only when using the `FIREBASE_*` triplet. Replace literal new lines with `\n`. |
| `FIREBASE_CLIENT_EMAIL` | Yes\* | Service account client email. |
| `FIREBASE_PROJECT_ID` | Yes\* | Firebase project ID, reused by admin SDK. |

### Payments & Banking
| Variable | Required | Description |
| --- | --- | --- |
| `MIDTRANS_SERVER_KEY` | Yes | Midtrans server key for Snap API requests (kept server-side). |
| `MIDTRANS_CLIENT_KEY` | Yes | Midtrans client key used in server-side API routes. |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Yes | Midtrans client key exposed to the browser for Snap embed. |
| `NEXT_PUBLIC_MIDTRANS_SNAP_URL` | No | Override Snap JS URL (defaults to Midtrans production URL). |
| `MIDTRANS_IS_PRODUCTION` | No | Set to `true` to hit production Snap endpoints; defaults to sandbox. |
| `NEXT_PUBLIC_BASE_URL` | No | Base URL for constructing payment callbacks (falls back to request host). |
| `NEXT_PUBLIC_BANK_NAME` | No | Label for manual transfer instructions (defaults to Mandiri). |
| `NEXT_PUBLIC_BANK_ACCOUNT_NUMBER` | No | Displayed account number for manual transfers. |
| `NEXT_PUBLIC_BANK_ACCOUNT_HOLDER` | No | Account holder name shown to learners. |

### Certificates
| Variable | Required | Description |
| --- | --- | --- |
| `FIREBASE_STORAGE_BUCKET` | Yes | Storage bucket used to persist generated certificates. |
| `CERTIFICATE_SIGNER_NAME` | No | Display name printed on the certificate footer. |
| `CERTIFICATE_SIGNER_ROLE` | No | Role printed below the signer name. |
| `CERTIFICATE_VERIFY_URL` | No | Base URL for certificate verification links. |
| `CERTIFICATE_MAKE_PUBLIC` | No | Set to `true` to call `makePublic`; otherwise a signed URL is generated. |
| `CERTIFICATE_ADMIN_EMAILS` | No | Comma-separated list of emails allowed to issue certificates via API. |

### MentorAI & AI integrations
| Variable | Required | Description |
| --- | --- | --- |
| `TOGETHER_API_KEY` | Yes | API key for the Together.ai endpoint used by MentorAI. |
| `HF_TOKEN` | No | Hugging Face access token for fallback models in API routes. |
| `NEXT_PUBLIC_HF_TOKEN` | No | Public alternative if certain widgets require HF access from the browser. |

### Miscellaneous
| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | No | Managed by the runtime; mentioned here for clarity. |

## Firebase Setup Checklist
- Create a Firebase project and web app, enable Email/Password and Google sign-in providers.
- Enable Firestore and Cloud Storage, define security rules that match your deployment requirements.
- Generate a service account with **Editor** or custom permissions for Firestore/Storage, then provide credentials using one of the methods listed above.
- Seed initial collections (`users`, `courses`, `certificates`, `announcements`, etc.) via the Firebase console or admin scripts.
- If you rely on custom claims or roles (admin/guru), ensure they are set when onboarding accounts.

## Payment Integration Notes
- Configure Snap on the Midtrans dashboard and copy the server/client keys.
- When testing locally, set `MIDTRANS_IS_PRODUCTION=false` and leverage the sandbox Snap URL (`https://app.sandbox.midtrans.com/snap/snap.js`).
- `NEXT_PUBLIC_BASE_URL` ensures asynchronous payment callbacks build absolute URLs; override it when running behind a reverse proxy.
- Manual transfer instructions fall back to Mentora-branded placeholder values; override them for production.

## MentorAI Configuration
- Provide a valid `TOGETHER_API_KEY` to enable `/api/consult` and `/api/mentorai` routes.
- You can supply `HF_TOKEN` (server) or `NEXT_PUBLIC_HF_TOKEN` (client) if you want MentorAI to switch models that live on HuggingFace.
- `src/lib/llamaClient.ts` contains lightweight canned responses used when the AI key is missing or as an instant fallback for common questions.

## Assignment DOCX Import
- Educators can prepare question banks using the `[PERTANYAAN]` template handled by `src/lib/assignments/docx-import.ts`.
- Run `npm run verify:docx-import` after touching the parser to ensure DOCX parsing still works.
- The parser enforces at least two options with one marked as correct (`[x]`) for MCQ questions and supports free-text prompts.

## Certificate Generation
- Admins call `POST /api/certificates/{certificateId}/generate` with a Firebase ID token; access is restricted via `CERTIFICATE_ADMIN_EMAILS` or the `role` field in Firestore.
- Certificates render via PDFKit, embed QR codes for verification, and persist the output to Cloud Storage.
- Notifications are pushed to `users/{uid}/notifications` so learners know when a certificate is ready.

## Progressive Web App
- `components/pwa-service-worker.tsx` handles safe service-worker registration, logging verbose messages only in development.
- `public/offline.html` is served when the app is offline; adjust branding and messaging there if needed.
- Update `public/manifest.json` to reflect the latest Mentora brand assets before publishing to stores.

## Deployment Tips
- Vercel is the most straightforward option for Next.js 15, but any Node.js hosting that supports the Edge-friendly runtime works.
- Ensure all environment variables and Firebase credentials are configured in the deployment environment.
- When using custom domains or proxies, double-check CORS settings (see `cors.json`) and `NEXT_PUBLIC_BASE_URL`.

## Contributing
- Use feature branches and open pull requests that describe the scope of change.
- Run `npm run lint` and (when relevant) `npm run verify:docx-import` before pushing.
- Keep documentation updated—this README is the primary onboarding reference for new contributors.
