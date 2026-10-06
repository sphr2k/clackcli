# Semantic status views

Add `Assessment = ok|warning|critical|unknown`; `StatusFact` has optional label and value. Tagged checks separate assessment from optional domain state; issues carry severity/title/detail/action/facts; fact rows are unassessed data; activity rows describe ongoing work without making health claims. StatusView gets optional summary, issues and footer. Keep legacy rows and details supported for 1.x consumers.

Render summary then issues, sections, footer. Glyphs remain distinct without color: ok ●, warning ▲, critical ■, unknown ?. Sanitize all user-controlled text, align by display width, wrap content and facts to supplied terminal columns (deterministic default 100). Use the supplied runtime stdout for both Clack and text output. Close the guide once after the actual final content, including empty sections and summary-only views. No metric thresholds or state-to-health inference in this library.
