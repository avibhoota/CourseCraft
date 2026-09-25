# CourseCraft

CourseCraft is a full-stack course-schedule constraint solver. Students select required courses, block unavailable times, choose preferred professors, and set workload limits. A backtracking solver rejects invalid combinations, ranks valid schedules, and explains why alternatives failed.

## Features

- Backtracking constraint solver with early branch pruning
- Required-course and section selection from a sample catalog
- Unavailable-time, earliest-start, campus-day, and workload constraints
- Preferred-professor scoring and transparent ranking
- Weekly calendar visualization with multiple ranked alternatives
- Rejection audit with counts and plain-language explanations
- Device-local saved schedules
- `.ics` calendar export with 15 weekly recurrences
- Responsive, keyboard-friendly interface
- WebMCP action for AI-assisted schedule generation when supported
- Cloudflare Worker-compatible Vinext build

## Tech stack

- Next.js-compatible routing via Vinext and Vite
- React 19 and TypeScript
- Tailwind CSS 4 with accessible Shadcn primitives
- Server API route for schedule generation
- Local Storage for private, device-local saved schedules

## Getting started

Requirements: Node.js 22.13 or newer and pnpm 11.

```bash
pnpm install
pnpm dev
```

Open the local URL shown in the terminal. The app includes a realistic starter catalog and constraints, so a ranked result appears immediately.

## Commands

```bash
pnpm dev      # start the development server
pnpm build    # create the Cloudflare-compatible production build
pnpm start    # run the built Worker locally
pnpm lint     # run ESLint
```

## How the solver works

The solver chooses exactly one section for each required course. At each step it checks:

1. overlap with a student's unavailable periods;
2. the earliest allowed class time;
3. collisions with sections already selected;
4. the final workload ceiling; and
5. the maximum number of campus days.

Invalid branches are abandoned immediately. Valid schedules are scored by professor matches, fewer campus days, and unused workload capacity. The API returns ranked results plus grouped rejection reasons.

Core algorithm: `lib/scheduler.ts`  
API endpoint: `app/api/schedules/route.ts`  
Main product UI: `app/page.tsx`

## Adapting the catalog

The demonstration catalog is stored in `app/page.tsx` as `COURSE_CATALOG`. Replace it with data from a registrar API or database while keeping the `Course`, `Section`, and `Meeting` types from `lib/scheduler.ts`.

## Privacy

Course selections are sent only to this app's own schedule API. Saved schedules remain in the browser's Local Storage and can be removed from the Saved tab.

## Deployment

This repository is configured for OpenAI Sites/Cloudflare Workers. It can also be adapted for any platform that supports a Next.js-compatible server runtime. Run `pnpm build` before deploying.

## License

MIT — see [LICENSE](LICENSE).
