# Phase 65 browser walkthrough findings

The latest preview was entered through the teacher path: Grade 10 → Physics → Open builder → MCQ quiz → Approved textbook chapters. The source step displayed only the two source cards before selection, with Approved textbook chapters marked Recommended. After selecting Unit 10, the chapter picker and title input appeared; the workflow advanced to Step 3 of 4 without stacking prior steps.

On Quiz Settings, the question-count input remained freely editable. Setting the count to 20 did not show a warning because the selected source estimate was higher than 20. Setting it to 100 displayed the non-blocking status message: “This source has about 28 distinct examinable topics, but you requested 100 questions. You can continue, but generation may ask for a broader approved source or fewer questions rather than repeat the same concept.” The Continue button remained enabled, confirming the warning does not block generation.

The first attempted direct `/ai-agent` preview URL returned 404 because the current teacher entry route is `/generate?board=FBISE&grade=10&subject=physics`; the root Quiz Centre path correctly navigated to that route.
