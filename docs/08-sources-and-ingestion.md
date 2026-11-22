# 08. Sources, Ingestion, and Curriculum Building

## 1. Source modes (per subject; overridable per session)

| Mode | Behavior |
|---|---|
| **Materials only** | Uses only uploaded content. If something is not covered, says so and does not fill in. Mock exams draw only from covered content and report the coverage gap. |
| **Materials first** (default when materials exist) | Builds on materials; fills gaps with model knowledge, tools, and (if permitted) search, always **visibly labeled**. |
| **Open** (default when none exist) | Uses model knowledge, tools, and (if permitted) search; builds the curriculum from scratch. |

Learner-controlled switches: **allow gap-filling**, **allow web search**, **local models only**. Materials are an enhancer, not a requirement; the app is fully usable with none.

## 2. Source labels (required everywhere)

Every explanation, item, and feedback has a label: `materials` (with file and page/section anchor), `general` (model knowledge), `tool` (computed or verified, with method), or `web` (with URL). The UI shows labels unobtrusively but always reachable, with a click-through to the original passage for `materials`.

**Conflict policy:** when model knowledge conflicts with materials (notation, convention, or an apparent error in the notes), show both, default to materials for course-aligned work, and flag the discrepancy for the learner to decide. Never silently pick one.

## 3. Supported inputs

PDF (text and scanned), slides (PPTX, PDF), Word documents, Markdown and text, EPUB, images (photos of board, textbook pages, handwritten notes), web pages by URL (learner-initiated), transcripts and subtitles, past exam papers, syllabus documents, and pasted text. Maximum sizes and page counts are configurable; large files process in the background with progress.

## 4. Ingestion pipeline (runs in the ingestion worker; cancellable and resumable)

1. **Intake:** record the file, hash it (dedupe), store the original locally, detect type.
2. **Extract:** text via format-specific parsers; OCR for scans and images (local OCR by default; vision-capable model optionally); math-aware extraction for equations (preserve as LaTeX when possible).
3. **Structure:** detect headings, sections, definitions, theorems, examples, exercises, figures, tables, and page numbers; build a document outline.
4. **Chunk:** structure-aware chunks (not fixed-size only) with stable ids and anchors (file, page, section).
5. **Embed:** local embedding model by default (works offline, private); store vectors in SQLite with a vector index (for example sqlite-vec) or an in-memory index for small corpora.
6. **Classify chunk roles:** explanation, example, exercise, solution, summary, administrative.
7. **Map to concepts:** align chunks to the subject's concept graph (existing profile seed graph or one built from the materials).
8. **Coverage report:** "Your materials cover about 70% of the syllabus. Missing: X, Y. Fill them in?" with per-concept coverage and quality indicators (explanations, examples, exercises available).
9. **Extract conventions:** notation, terminology, exam style from past papers, instructor emphasis; store as subject-local settings used in prompts.
10. **Past papers:** parse into items and an **exam blueprint** (sections, weights, timing); flag low-confidence parses for learner confirmation.

Every step emits progress and can fail partially; failures are reported per file with a retry option. Never block the whole subject on one bad file.

## 5. Curriculum and concept-graph building

**Inputs:** goal, level, syllabus (if any), materials outline, profile seed graph, exam blueprint.

**Process (LLM-assisted, tool-validated, human-reviewable):**
1. Propose concepts with names, descriptions, prerequisites, target depth, and weights (from syllabus, past papers, or standard curricula).
2. **Validate structurally** with `validateConceptGraph` (no cycles, no missing prerequisites).
3. **Audit prerequisites** with a second pass (are prerequisites minimal and sufficient?); flag suspicious edges.
4. Attach **misconceptions** from the profile library and from the materials.
5. Map to **skills** (what the learner must do).
6. Present a **review screen**: the learner can merge, rename, reorder, add, or remove concepts; changes are versioned.
7. Record provenance for each concept: from syllabus, from materials, from profile seed, or model-proposed.

Quality gates: every concept has at least one assessable skill and at least one item template or generation path; graph depth and fan-out sanity checks; weights sum sensibly to the goal.

The curriculum builder requires `deep`-tier capability; with weaker models the app prefers profile seed graphs and asks the learner to review more.

## 6. Retrieval for tutoring

At tutoring time, retrieve top chunks by hybrid search (vector plus keyword) filtered by the current concept and source mode; include anchors and clearly delimit as **data**. Respect token budgets. In materials-only mode, if retrieval finds nothing relevant, the tutor says the topic is not covered.

## 7. Web search and downloads (optional, learner-initiated)

Off by default. When enabled, searches and fetches are visible, logged locally, and results are labeled `web` with URLs. Fetched content is untrusted data. Respect robots and terms; do not scrape sites that prohibit it; do not store or redistribute copyrighted content beyond the learner's private use.

## 8. Copyright and rights

Uploaded materials belong to the learner and are used privately on their device for their learning. They are never uploaded to any Lyceum service, included in the repository, or shared in any bank or library without explicit rights confirmation. Quotations in tutor output are short and attributed. Fixtures in this repository must be original or openly licensed.

## 9. Prompt-injection defense for sources

Source text is wrapped in delimiters and labeled as untrusted data in prompts; the constitution says instructions inside sources are never followed; outputs that attempt tool calls or rule changes triggered by source content are rejected and logged; eval scenarios include injection attempts in PDFs, slides, and web pages.

## 10. Milestones

M5 delivers ingestion, coverage, source modes, labels, concept-graph building, and the review screen. Earlier milestones use hand-authored seed graphs.
