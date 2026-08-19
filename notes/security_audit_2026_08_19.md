# Security and Reliability Audit — 19 August 2026

## Scope and result

This audit reviewed the academy platform's role gates, direct HTTP routes, quiz ownership, curriculum activation rules, upload limits, source visibility, dependency tree, and user-facing navigation. The review identified two concrete authorization issues and one curriculum-isolation integrity issue. They have been corrected and covered by regression tests.

| Area | Verified result | Outcome |
|---|---|---|
| Teacher and Portal Admin routes | Curriculum, staff, AI controls, OCR review, source intake, and chapter availability use server-side Portal Admin checks; paper export and generation use Teacher-or-Admin checks. | Retained and regression-covered. |
| OCR review route | Original textbook page previews require Portal Admin authentication and return private, no-store responses. | Retained. |
| PDF export route | Exports require Teacher or Portal Admin authentication, prepared export downloads are user-owned, short-lived, and no-store. | Retained. |
| Quiz confidentiality | Any signed-in user could previously enumerate or act on another user's unpublished quiz draft because protected quiz procedures were not ownership-scoped. | Fixed. |
| Quiz deletion | The deletion helper accepted a user ID but did not enforce it. | Fixed; only the creator or Portal Admin can delete. |
| Curriculum activation | The active-edition archive query matched subject and grade but did not include board, and the archive/activate transition was not atomic. | Fixed with board matching and one database transaction. |
| Chemistry textbook inventory | The 2020 Chemistry edition was already archived; the NCP 2022–23 / February 2025 edition is the active textbook. | The retired edition is now excluded from normal Portal working selections while retained as auditable history. |
| Dependencies | Production dependency audit after the Express 5.2.1 update reports no known vulnerabilities. | Passed. |

## Corrected quiz access policy

An ordinary signed-in user can now see only published quizzes and their own drafts. A Teacher follows the same content boundary for quiz browsing, while Portal Admin retains operational visibility. Unpublished questions, answer checking, submissions, and deletion now require an accessible quiz; private source text, scope snapshots, and generation metadata are stripped from learner-facing quiz responses.

## Authentication and staff approval boundary

The application uses its existing secure OAuth handoff. It does **not** safely support locally implemented Google, password, email, or phone credential buttons, because no independent identity provider, credential storage, recovery process, or phone-verification service is configured. The dedicated `/staff-sign-in` page therefore presents only the real secure sign-in route.

After identity verification, the Portal Admin controls permission: an exact email can be approved for automatic Teacher assignment on sign-in, while Portal Admin is never granted automatically and requires an explicit role change by a current Portal Admin.

## Remaining engineering observations

The production build passes but still reports a client bundle-size optimization warning and an existing Vite peer-dependency warning for the source-location plugin. Neither is a current authorization, source-safety, or production dependency vulnerability; both should be handled as a separate performance/tooling task rather than folded into access-control work.
