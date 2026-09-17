# Royal Maple dashboard card design QA

source visual truth path: `/workspace/scratch/e694a5abc1c2/upload/add2d38a-d0d6-4bd6-bbb5-ed7f807b8ea8.png`
secondary supplied implementation reference path: `/workspace/scratch/e694a5abc1c2/upload/13e19894-6f0b-4046-9cc7-7b36ce7b3e0a.png`
implementation screenshot path: `/tmp/royal-dashboard-after-0.10.10.png` (cloud-browser capture)
viewport: cloud browser dashboard viewport; source visual 1491 × 1055 px; supplied compact reference 554 × 611 px; implementation capture uses the live dashboard viewport and preserves the existing responsive layout.
state: I/L Wizard dashboard, dashboard page open, Equipment Inventory visible, HP/MP slots visible, level-aware default loadout.

## Comparison history

### Pass 1 — before 0.10.10

Findings:
- [P1] The dashboard Equipment Inventory card had a dark opaque center stage, dim brown slot borders, and generic small corner marks; the supplied Royal Maple reference has visible town artwork, bright antique-gold double frames, maple-leaf ornaments, and stronger controls.
- [P2] The final compact stylesheet layer still described the equipment card as allowing the “heavy framing” to disappear, which directly contradicted the selected reference.

Fixes made:
- Added a final reference-fidelity CSS layer after the compact dashboard overrides.
- Restored controlled town art inside the Equipment Inventory card, removed the opaque inner stage, strengthened the frames and slot borders, added the maple-leaf asset, and restyled the card controls.
- Bumped the cache token to `0.10.10-royal-reference-fidelity`.

### Pass 2 — after 0.10.10

Post-fix evidence to record after the live deployment:
- The dashboard card visibly uses the Royal Maple frame system rather than the former understated generic panel.
- The Equipment Inventory card exposes the class-town art behind a dark readability layer, with maple ornaments and gold-framed slots.
- The existing grid, item icons, HP/MP slots, and controls remain present and in their established positions.

## Required fidelity surfaces

- Fonts and typography: ivory/serif display headings and compact readable labels retained; no content copy changes.
- Spacing and layout rhythm: existing dashboard columns, slot grid, and card heights are preserved; no layout redesign is introduced.
- Colors and visual tokens: antique gold, dark plum/parchment, class accent, and restrained red maple accents now match the supplied reference direction.
- Image quality and asset fidelity: current class-town WebP art remains the background source; the maple-leaf ornament is a real raster asset derived from the supplied reference direction; item/potion icons remain the existing canonical assets.
- Copy and content: unchanged.

## Browser QA

- Primary interaction tested: dashboard load with Equipment Inventory and HP/MP slots visible.
- Additional interaction to test after release: click an equipment slot and click HP/MP slots; confirm the existing replacement and potion option modals still open.
- Console errors: check the live tab and record only application-origin errors; browser metadata-extension noise is not an application failure.

final result: blocked
