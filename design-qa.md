# Royal Maple dashboard card design QA

source visual truth path: `/workspace/scratch/e694a5abc1c2/upload/add2d38a-d0d6-4bd6-bbb5-ed7f807b8ea8.png`
secondary supplied implementation reference path: `/workspace/scratch/e694a5abc1c2/upload/13e19894-6f0b-4046-9cc7-7b36ce7b3e0a.png`
implementation evidence: live cloud-browser capture for the 0.10.13 release; visual QA was performed against the deployed dashboard
viewport: cloud browser inner viewport 1363 × 936 CSS px at device pixel ratio 1; source visual 1491 × 1055 px; supplied compact reference 554 × 611 px; implementation capture uses the live dashboard viewport and preserves the existing responsive layout.
state: I/L Wizard dashboard, dashboard page open, Equipment Inventory visible, HP/MP slots visible, level-aware default loadout.
Figma frame reference: https://www.figma.com/design/vM5lzAtSpIEki4NVXftrkg
release: 0.10.13-royal-corner-frames; source f9b4970bb21aa5c256b4758695765709536af45a; generated site 5af82c97dbbd00a003c5b2eac506b4eb9bdac84f.

## Comparison history

### Pass 1 — before 0.10.11

Findings:
- [P1] The dashboard Equipment Inventory card had a dark opaque center stage, dim brown slot borders, and generic small corner marks; the supplied Royal Maple reference has visible town artwork, bright antique-gold double frames, maple-leaf ornaments, and stronger controls.
- [P2] The final compact stylesheet layer still described the equipment card as allowing the “heavy framing” to disappear, which directly contradicted the selected reference.

Fixes made:
- Added a final reference-fidelity CSS layer after the compact dashboard overrides.
- Restored controlled town art inside the Equipment Inventory card, removed the opaque inner stage, strengthened the frames and slot borders, added the maple-leaf asset, and restyled the card controls.
- Bumped the cache token to `0.10.11-royal-card-parity`.

### Pass 2 — after 0.10.11

Post-fix evidence from the live deployment:
- The live stylesheet token is `0.10.11-royal-card-parity`.
- The dashboard card visibly uses the Royal Maple frame system rather than the former understated generic panel: antique-gold double framing, plum/parchment surfaces, real maple ornaments, and brighter slot/control borders.
- The Equipment Inventory card exposes the I/L Wizard's Ellinia art behind a dark readability layer; the live route checks map Fighter → Perion, Hunter → Henesys, and I/L Wizard → Ellinia.
- The existing grid, item icons, HP/MP slots, and controls remain present in their established positions; every live class route rendered 20 gear slots and 2 potion slots.
- Clicking the live Hat slot opened the replacement modal with 6 choices. Clicking HP opened the potion modal with 6 potion cards, including the recommended feature card and alternate options. Both dialogs closed successfully.
- The live console contained no application-origin errors. The recorded errors were browser metadata-extension noise from `chrome-extension://...`, not site runtime failures.

## Required fidelity surfaces

- Fonts and typography: ivory/serif display headings and compact readable labels retained; no content copy changes.
- Spacing and layout rhythm: existing dashboard columns, slot grid, and card heights are preserved; no layout redesign is introduced.
- Colors and visual tokens: antique gold, dark plum/parchment, class accent, and restrained red maple accents now match the supplied reference direction.
- Image quality and asset fidelity: current class-town WebP art remains the background source; the maple-leaf ornament is a real raster asset derived from the supplied reference direction; item/potion icons remain the existing canonical assets.
- Copy and content: unchanged.

## Browser QA

- Primary interaction tested: dashboard load with Equipment Inventory and HP/MP slots visible.
- Additional interaction tested after release: equipment replacement and HP potion dialogs opened and closed successfully; the potion dialog rendered its recommended and alternate cards.
- Console errors: application-origin errors none; browser metadata-extension noise was isolated from application evidence.

final result: passed
