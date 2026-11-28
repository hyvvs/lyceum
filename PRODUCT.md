# Lyceum — product context

<!-- impeccable:product-schema 1 -->

This record is distilled from the existing repository rules, task cards and explicit owner instructions. No new user interview was conducted for this visual-only prototype revision. Product directions not yet implemented remain aspirations, not claims about working software.

## Platform

web

Lyceum has a React web/PWA surface and a Tauri v2 wrapper for Windows/macOS. The current owner-reviewed liquid-crystal design is an **isolated visual prototype**, not the production application.

## Users

Learners who want to build durable understanding of a subject. The intended workflow includes setting a goal, gathering materials, reading, practising, diagnosing mistakes and reviewing over time. Exact learner demographics and enrollment context are not yet established.

## Product Purpose

A local-first, model-agnostic mastery tutor. The learner's next useful action should be clear, and its explanation, source and evidence should remain honest. An empty account must look thoughtfully ready rather than imply learning history that has not happened.

## Operating Context

The proposed application will eventually manage learner goals, sources, study sessions, and review. Currently the visual fixture exercises Today, Sources, Reading and Setup, with optional **explicitly synthetic** example materials and reading. Those are not actual imported sources, saved sessions, measured mastery or connected model accounts.

## Capabilities and Constraints

- Keep learner information local by default; no silent provider access, telemetry, credential storage or new network calls in the prototype.
- Accepted M0-005 Tauri security and dependency controls must not be weakened by visual work.
- Treat source material and model responses as untrusted. Never invent mastery or citations.
- Preserve accessible keyboard, touch, RTL, high-contrast, reduced-motion and reduced-transparency paths.
- Design for browser Chromium and native Windows WebView2 without implying physical performance or release acceptance from screenshot evidence.
- No new persistent storage or provider implementation in the visual prototype; M0-007 remains deferred.

## Brand Commitments

- Name: **Lyceum**.
- The owner has explicitly requested a **modern, elegant liquid-crystal / liquid-glass learning workspace** with fluid, natural, interrupted and reversible motion.
- The owner has rejected the existing visual composition as generic and instructed a full visual replacement. Reference videos are material and movement inspiration only, not a layout to copy.
- Focused reading must remain legible and relatively opaque. Decorative ambient animation must not disturb study.

## Evidence on Hand

- Existing React, Storybook and Tauri implementations, technical foundation, automated accessibility and UI tests, and genuine Chromium / Windows renderer captures.
- A directly supplied V5-labeled example was viewed previously; it is **not authenticated** as identical to the earlier specified original. The complete authentic V10 is not available.
- No actual learner account content exists in the visual prototype. Synthetic examples must always be clearly identified.

## Product Principles

1. Every screen makes the next learning decision apparent.
2. Progress and confidence are earned by evidence, never by manufactured metrics.
3. Reading and study remain more important than chrome.
4. Interface motion communicates location and action, and can be interrupted.
5. Privacy, accessibility, responsiveness and performance are nonnegotiable quality gates.

## Accessibility & Inclusion

WCAG 2.2 AA is a project release target, not a certification. The original 20 manual accessibility cases, real assistive technology, native Windows Contrast themes, physical pixel-contrast tests, first-painted-frame and performance budgets are still unaccepted.
