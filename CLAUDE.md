@AGENTS.md

# Code Standards

## Files
- Max **150 lines** per file. If a file would exceed this, split into smaller modules and use subfolders.
- No comments of any kind — no inline comments, no JSDoc, no `//`, no `/* */`.
- No unused variables, imports, or dead code.

## Style
- TypeScript only. No `any` unless absolutely unavoidable; prefer explicit types.
- Functional components only. No class components.
- No default exports for types/interfaces — use named exports.
- Prefer `const` over `let`. Never use `var`.

## React
- No `useEffect` for derived state — compute it inline.
- Keep components focused: one concern per component.
- Inline styles only for dynamic values. Use Tailwind for static styles.

## Git workflow
- Always work on a feature branch (`feat/`, `fix/`, `refactor/`).
- Commit on the feature branch, then merge to `dev` with `--no-ff`.
- Never commit directly to `main` or `dev`.
- Commit messages in English, imperative mood.
