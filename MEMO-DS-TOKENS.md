# 🔒 MEMO-DS-TOKENS — Full design-system token compliance is mandatory

**Status:** design-system **token compliance is now required**, not aspirational.
The `ds-compliance` gate is blocking. Every colour, size, and spacing value your UI
renders must resolve to a design-system token or a standard scale utility — **not**
a hand-picked literal.

## The rule
1. **Colour** — never a raw `#hex` / `rgb()` / `hsl()` / palette literal. Use a DS
   semantic token (`var(--color-…)`, `text-fg`, `bg-surface`, `border-border`, …).
2. **Radius / container width / breakpoint** — use the DS scale tokens
   (`--radius-*`, `--w-*`, `--bp-*`), never a bespoke px value.
3. **Spacing & type-size** — the DS deliberately defers these to Tailwind's standard
   scale. Use the standard utilities (`p-4`, `gap-6`, `text-sm`, `w-80`), **never an
   arbitrary value** (`p-[15px]`, `text-[13px]`, `w-[300px]`). If a standard step is
   close, use it.
4. **Primitives** — adopt `@42labs/*` from the registry; never hand-roll a primitive
   the registry already ships (`<input>`, tabs, etc.).

## Exceptions are narrow and individual
`drift-allow:` is **only** for values that genuinely cannot map to any token or
standard utility, and **each one must carry its own specific reason** on the line:
- vendor brand marks (a logo's fixed brand colours),
- generative / decorative art with a hard-coded palette,
- inherently relative or one-off values with no scale equivalent
  (`max-h-[80vh]`, `text-[0.85em]`, a device-mock's exact geometry).

A blanket "it's all showcase" allow is not compliance. If a value *can* be a token or
a standard utility, **tokenize it — do not allow it.** Allows are the rare tail, not
the strategy.

## Definition of done
- [ ] Zero raw colour literals outside individually-justified `drift-allow:` lines
- [ ] Zero arbitrary Tailwind values where a token or standard utility exists
- [ ] Every remaining `drift-allow:` names a real, specific reason
- [ ] `ds-compliance` gate green on that basis

---
Design-system repo: `~/42labs/design-system` · Tokens & registry:
`https://ds.42labs.io` · Current pin: **0.6.0**
