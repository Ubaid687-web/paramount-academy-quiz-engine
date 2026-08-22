# Phase 130: Source-Governed Paper Library Findings

The existing `assessmentPatternSources` records already hold the original paper object, programme identity, paper kind, year, chronological metadata, extraction status, and generation-activation status. A second paper repository would duplicate provenance and weaken review controls.

Student visibility is therefore an independent Portal Admin publication decision. A paper is eligible for the signed-in paper library only when it is an active, extracted original PDF whose `studentLibraryStatus` is explicitly `published`. Draft sources, text/Markdown reconstruction references, and unreviewed materials remain unavailable to student filtering and download endpoints.

The Quiz Centre now exposes one compact **Browse paper PDFs** entry. Its dedicated view filters approved papers by grade, subject, year, and paper type. The Portal Admin paper workspace retains separate model/past-paper intake and now provides original-PDF download plus a clear publish/hide action. Current Grade 10 sources remain hidden by default; activating a paper for style guidance never publishes it to students.

Visual checks confirmed that the Quiz Centre entry remains focused and that the Portal Admin Curriculum Library preserves its task-based structure. Automated validation covers student filters/download requests and Portal Admin publication controls.
