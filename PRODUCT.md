# Lumio

AI-powered personal workspace that centralizes notes, documents, emails, and calendar into one intelligent application.

Lumio isn't just a productivity app — it's a personal AI assistant that understands your workspace and helps you organize your life.

## Vision

A better, quicker way to organize life than juggling separate email, notes, and calendar apps. Everything joined together with an AI assistant that answers questions, summarizes, and helps you stay on top of things.

## Target Audience

Everyone — individuals and businesses alike. Lumio aims to be a daily driver for personal organization and professional productivity.

## Design Philosophy

The application must look and feel like an Apple product — as if Apple designed an AI workspace.

**Primary Reference:** macOS, iOS, Apple.com, Apple Design Resources

**Secondary Inspiration:** Linear, Arc Browser, Notion, Raycast

### Apple-Specific Guidelines

- **Typography:** Use San Francisco (-apple-system) font stack. Large, weight-balanced headings. Ultra-thin system font for small metadata text.
- **Colors:** Apple's neutral palette — mostly whites, grays, and blacks. Single accent color (Lumio blue or brand color) used sparingly like Apple's accent blue. No flat blacks — use dark grays (e.g., #1d1d1f).
- **Spacing:** Generous, consistent 8px grid. Apple uses lots of breathing room — never cramp elements.
- **Corners:** Apple uses large corner radii (12–18px on cards, 6–8px on buttons). Consistent rounding everywhere.
- **Shadows:** Soft, diffuse shadows like macOS/iOS. Multiple shadow layers for depth. No harsh box-shadows.
- **Animations:** iOS/macOS spring animations — smooth, natural, responsive. Use `cubic-bezier(0.42, 0, 0.58, 1)` or Apple's default spring curves. Fade + scale transitions.
- **Glassmorphism:** Only where Apple uses it — menu bars, sidebars, toolbars. Ultra-subtle backdrop blur (`backdrop-filter: blur(20px)` with low opacity background).
- **Icons:** Apple-style SF Symbols or a custom set that matches Apple's rounded, stroke-based style. Consistent weight (regular or medium).
- **Sidebar:** macOS Finder-style sidebar — translucent, narrow, with minimal icons and compact labels.
- **Top bar:** macOS menu bar style — thin, translucent, with traffic light system controls or minimal back/forward.
- **Empty states:** Apple-style illustration + concise message. No cartoonish illustrations. Clean, minimal, elegant.
- **Loading:** Skeleton screens matching Apple's approach — gray shapes that mirror content layout. No spinners unless necessary.
- **Inputs:** iOS-style — no border, just background fill, rounded, with clear visual feedback on focus.
- **Cards:** White cards on light gray background (like macOS Finder grid view). No borders, just subtle shadow.
- **Scrollbars:** Overlay scrollbars (auto-hiding, thin) like macOS.

### Principles
- Minimal, elegant, calm
- Premium and extremely clean
- Spacious with large typography
- Smooth animations, beautiful hover states
- Pixel-perfect spacing and typography
- Must NOT look like a traditional admin dashboard

Every component should feel polished and intentionally designed. Loading states, empty states, and transitions should feel premium. If it doesn't feel like it belongs on a Mac or iPhone, it doesn't belong in Lumio.

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Django + Django REST Framework |
| Database | PostgreSQL with pgvector |
| AI | Nvidia free-tier LLM (model TBD) |
| Auth | Google OAuth (email/password optional) |
| Email | Gmail API, Outlook API (OAuth) |
| File Storage | Local (dev), S3 (prod) |
| Containerization | Docker, docker-compose |

## Project Structure

```
lumio/
├── frontend/    # React + Tailwind + shadcn/ui
├── backend/     # Django + DRF
├── docker-compose.yml
└── docs/        # Product documentation
```
