# RIAT Evidence-Grounding Source Audit

Date: 2026-06-22

## Local Sources Inspected

The following local, git-ignored source folders were inspected for grounding and roadmap signals:

- `01-resources/01--conversations/emails`
- `01-resources/01--conversations/meetings`
- `01-resources/01--conversations/office-chats`
- `01-resources/04--teams`
- `01-resources/04--teams/analise`
- `01-resources/analysis`
- `01-resources/research`

Binary documents and spreadsheets were not fully imported into the application. Workbook metadata was inspected enough to identify relevant sheets:

- `RIAT_May2025_REV-20260611.xlsx`: includes `Fontes p Dim de Impacto`.
- `RIAT_May2025_REV_Gabriel_TechnologicalEvidence_20260526.xlsx`: includes `Tech evidence matrix`.
- `RIAT_ CLEAN VERSION_AA comments.xlsx`: includes revised-question and dimension-definition sheets.

## Main Requirements Found

- RIAT Copilot should remain assessment-first, not a generic chatbot.
- Recommendations must be tied to RIAT dimensions, scores, written examples, and curated sources.
- When evidence is weak, missing, or contradictory, Copilot should surface caveats rather than inventing confidence.
- Dimensions 9-16 may become recommendation or impact lenses rather than more questionnaire burden; this is a product decision that still needs team confirmation.
- Legal/privacy/onboarding text remains a product adoption blocker.
- The team needs a reviewed source base by dimension, including scientific articles, frameworks, reports, datasets, and internal notes.
- The Teams/email materials contain candidate references for Educational, Technological, and Entrepreneurial dimensions that should be imported only after review.

## Platform Coverage Added

- Admin/backoffice source management exists at `/groundingreferences`.
- Backend admin and REST endpoints support source CRUD.
- Sources can apply to all dimensions or to specific dimensions.
- Review status controls whether a source is available to Copilot: only active `reviewed` or `approved` sources are included.
- Report Copilot output can render `reference_sources` with source and dimension information.
- A CSV import path exists for reviewed source batches:

## Backend Validation Baseline

As of 2026-07-09, the grounding-reference backend path was validated with:

- `DB_ENGINE=sqlite python backend/manage.py test api.tests.GroundingReferenceImportParserTests api.tests.GroundingReferenceSerializerTests api.tests.GroundingReferenceApiTests api.tests.CopilotPlanNormalizationTests` - focused grounding-reference backend tests: 10 tests, OK.
- `DB_ENGINE=sqlite python backend/manage.py test api` - full api backend tests: 13 tests, OK.
- `DB_ENGINE=sqlite python backend/manage.py check` - Django system check: no issues.

```bash
cd backend
.venv/bin/python manage.py import_grounding_references ../docs/templates/grounding-references-template.csv --validate-csv-only
.venv/bin/python manage.py import_grounding_references ../docs/templates/grounding-references-template.csv --dry-run
```

## Source Review Workflow

1. Extract candidate rows from Teams spreadsheets or email references.
2. Normalize each row to `docs/templates/grounding-references-template.csv`.
3. Map `dimensions` by exact RIAT dimension name or numeric dimension id. Use `|` between multiple dimensions.
4. Mark unreviewed sources as `draft`; mark sources as `reviewed` or `approved` only after RIAT team validation.
5. Run the import command with `--validate-csv-only` to catch missing required fields without touching the database.
6. Run the import command with `--dry-run` against the real RIAT database to validate dimension ids/names.
7. Import without `--dry-run` only after the dry run succeeds.
8. Spot-check imported rows in `/groundingreferences`.

## Candidate Source Groups Not Yet Imported

- Educational references from Fernando Almeida's 2026-05-20 email.
- Technological references from Fernando Almeida's 2026-05-27 email and the `Tech evidence matrix` workbook.
- Entrepreneurial references from Fernando Almeida's 2026-05-27 email.
- Impact-dimension sources from `Fontes p Dim de Impacto`.
- Extracted project-report dataset from `01-resources/04--teams/analise/dataset_20260225`, useful for pilot analysis and example evidence, not automatically a scientific source.

## Remaining Decisions

- Decide whether dimensions 9-16 are assessment questions, recommendation lenses, or optional modules.
- Decide whether external LLM calls are acceptable for non-sensitive/demo data.
- Decide who approves source review status.
- Decide whether source import should remain a management command or receive a full admin upload UI later.
