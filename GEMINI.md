# ZÜMA Engineering Guide

## Project

ZÜMA is a premium streetwear brand.

The objective is not to ship features quickly.
The objective is to build a maintainable, high-performance production application.

Always prioritize:

1. Simplicity
2. Readability
3. Performance
4. Maintainability

Never choose clever code over understandable code.

---

# Stack

- React
- TypeScript
- Vite
- Supabase
- TailwindCSS
- Vercel

---

# Architecture Rules

Never change the project architecture without being asked.

Never move files between folders unless explicitly requested.

Respect the current folder structure.

Components only render UI.

Hooks contain business logic.

Providers only manage global state.

Integrations contain external services.

Utils contain pure functions.

Types contain shared types.

---

# Performance

Performance is a priority.

Always:

- reduce bundle size
- avoid unnecessary rerenders
- lazy load when appropriate
- avoid unnecessary useEffect
- avoid duplicated state
- prefer memoization only when useful

Never optimize blindly.

Always explain the expected performance gain.

---

# React

Prefer:

- functional components
- composition
- small components

Avoid:

- giant components
- duplicated logic
- deeply nested JSX

---

# TypeScript

Never use any.

Always prefer explicit types.

Avoid unnecessary type assertions.

---

# Supabase

Never expose secrets.

Never modify database schema unless explicitly requested.

Never change RLS policies without approval.

Never remove existing SQL migrations.

Never break compatibility.

---

# Admin

The admin dashboard is production critical.

Be extremely conservative.

Never change business logic without approval.

---

# Store

The store sells print-on-demand products.

There is NO inventory management.

Never introduce stock management.

Never suggest inventory validation.

Products are always available.

---

# Sendit

Orders must NOT automatically be sent to Sendit.

The workflow is:

Customer places order

↓

Admin validates order

↓

Only then send to Sendit

Never bypass this workflow.

---

# Code Style

Prefer readability over compactness.

Keep functions short.

Avoid deeply nested if statements.

Extract reusable logic.

Use meaningful names.

---

# Before modifying code

Always explain:

- why
- impacted files
- risks
- expected gain

Never modify more files than necessary.

---

# Audit Mode

When asked to audit:

Do NOT modify code.

Give:

- score /10
- positives
- P1
- P2
- P3
- impacted files
- technical debt
- performance impact
- maintainability impact

Be extremely critical.

Assume this project will be used in production.

# Project Philosophy

This project is expected to reach production quality.

Never optimize only because something "looks cleaner".

Every modification must have a measurable benefit.

When suggesting improvements, estimate:

- complexity
- maintainability
- performance impact
- bundle impact
- risk

Always classify work:

P1 = Must fix before production

P2 = Should improve

P3 = Nice improvement

---

# Working Method

Never modify more than one feature at a time.

Always start by explaining:

- what you found
- why it matters
- files impacted
- expected benefit

Wait for confirmation before editing.

---

# Existing Technical Decisions

These decisions are intentional and must be respected.

- Supabase client is lazy-loaded.
- Admin pages are lazy-loaded.
- Store and Index are two separate projects.
- Products are print-on-demand.
- There is no stock management.
- Orders are manually validated before shipping.
- Sendit integration must remain manual until admin approval.

Do not revert these decisions.

---

# Refactoring Rules

Refactor only if at least one of these is true:

- improves readability
- removes duplication
- improves performance
- fixes a bug
- improves maintainability

Do not refactor for personal preference.

---

# Security

Never expose:

- API keys
- service_role keys
- secrets

Never weaken authentication.

Never weaken database security.

---

# Review Mode

When reviewing code:

Be more critical than complimentary.

Do not praise code unless justified.

Assume the project will be maintained for years.

Prefer long-term maintainability over short-term convenience.
