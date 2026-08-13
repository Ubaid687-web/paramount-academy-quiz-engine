# Paramount Academy Quiz Engine: Portal Admin Access Model

## Teacher Workflow

All teachers use the same readable MCQ preparation path:

> **Grade → subject → one relevant action.**

The teacher-facing screen starts with Grade 10 and Grade 9. After a grade is selected, it shows the current shared MCQ subjects: Physics, Chemistry, and Computer Science. Teachers then choose a subject and begin a focused MCQ draft. Staff names, technical source setup, and administrator controls are intentionally absent from this path.

## Grade Readiness

| Grade | Teacher-facing status | Next action |
|---|---|---|
| Grade 10 | Active MCQ preparation flow | Select Physics, Chemistry, or Computer Science and prepare a draft from lesson material or an approved source. |
| Grade 9 | Curriculum intake flow | Select a subject to see that its revised FBISE pattern and approved material must be confirmed before generation is enabled. |
| Below Grade 9 | Not part of this MCQ module | Keep outside the current quiz engine until a separate assessment model is approved. |

## Portal Admin Responsibilities

Portal Admin controls which signed-in academy accounts may use the protected curriculum-management capability. Portal Admin prepares and activates approved curriculum sources, reviews draft readiness, and manages future subject expansion. This capability is not part of normal teacher navigation.

All teachers are intended to have access to every currently configured MCQ subject. Therefore, the system does not create confusing per-teacher subject menus or use personal names as access controls. If the academy later wants different subject permissions, Portal Admin can add them through a dedicated authorization feature.

## Integration with the Main Academy Portal

The Replit portal should provide the user identity, teacher/admin permission, student/class assignment, and publication workflow. This quiz engine supplies the progressive MCQ-preparation experience, source-grounded draft contract, and review-safe generation process. Only reviewed/published quizzes should be assigned to students.
