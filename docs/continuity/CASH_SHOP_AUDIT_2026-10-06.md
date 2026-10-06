# Founder’s Access Cash Shop audit — 2026-10-06

Release: `0.13.1-founders-cash-shop`. Final deployment pending. The 0.13.0 browser/data gates passed; the final 0.13.1 snapshot adds coupon style lists and weapon restrictions and scopes regional restrictions to the products stated by Nexon.

The user explicitly requested the new Nexon release catalog as the default, retention of the previous catalog as Beta Cash Shop with its original prices, and lifetime tags beside prices: grey time-limited tags and red uppercase PERMANENT tags. This supersedes hiding useful beta-shop labels from the public UI.

## Sources and coverage

- [Nexon announcement, published 2026-10-05](https://www.nexon.com/maplestory/news/sale/45819/founder-s-access-cash-shop), fetched live 2026-10-06 with Firecrawl. All 69 unique priced products are represented; Aurora’s crate appears twice in the article but is one offer. Pack-size variants retain their own prices and quantities.
- [Founder’s crate rates](https://www.nexon.com/maplestory/general-post/45538): 50 rewards. [Aurora crate rates](https://www.nexon.com/maplestory/general-post/45659): 26 rewards. These are expandable reward lists, not separately priced shop offers.
- Previous OSMS export pinned at commit `d744a66e48fe5c80a33ce464693b869c0a4f556c`, `data/current/cash_shop.json`, blob `d7fa4ff0b3b7269f2dac0fa62b2bb64f48b58f2b`. `audit/beta-cash-shop.json` retains the complete export, SHA-256 `5cf145cac31ad32302852a47666d8eb6c1c0171e1dbab089c0eb734641777122`.
- All 872 beta entries and all original fields remain in the generated catalog. 130 were marked for sale. Their 100 NX test prices are not replaced with Founder’s Access prices.
- Source dashboard `tabs/cashshop.js` labels `period` in days, `life` as days until pet revival, and `limited_life` as seconds of active pet life. Pet life takes precedence over a zero commodity period.

## Lifetime and price rules

- Release: 27 permanent products, 42 time-limited products. Sale dates are independent of the item’s expiry. Evergreen availability is not treated as permanence.
- Beta: 31 permanent, 116 timed, 725 duration-unconfirmed entries. A sold offer with period 0 and no pet-life limit is classified permanent. An unavailable zero-period record has no sold commodity proving an expiry; its tag stays grey and explicitly unconfirmed.
- Beta price 0 stays 0 in the database, but is displayed as UNAVAILABLE rather than free.
- Monthly Essentials costs 9,900 NX for 30 days; Convenience and Pet Booster Essentials each cost 9,900 NX and are permanent packages. Their 90-day consumable contents are separately listed in Details & contents.
- Both fashion crates expire in 7 days. The announcement and official rate tables do not specify reward lifetimes, so the UI does not apply the crate’s expiry to its clothing rewards or invent permanent reward status.
- Aurora prices stay in Aurora Stamps. Exchange coupons expire in 14 days; resulting palette/cleanser utilities expire in 30 days.
- Founder’s crate and Mystery Style offers end 2026-10-28 07:59 UTC. 10-day equipment covers and Fall Store Permit end 2026-11-18 17:59 UTC. Aurora Season 1 ends 2027-01-13 07:59 UTC. All opening times are after maintenance on October 6; no precise maintenance-end time is invented.
- Bundle discounts use the current price, retaining crossed-out comparison prices. Gifting requires Lv12. Per-world/account purchase limits, contents, relevant pet compatibility, hair/face choice lists, weapon-cover restrictions, and the regional restrictions explicitly stated for each product are in the UI.

## Implementation

- `audit/import-nexon-cash-shop.py` creates the reviewed structured Nexon snapshot from markdown; the runtime never scrapes.
- `audit/cash-shop-catalog.cjs` combines separate release and beta catalogs without mutating the beta export. `cash-shop-catalogs.json` is built and versioned with the service worker.
- `public/cash-shop-runtime.js` replaces only the old Cash Shop renderer. Search, category/lifetime/availability filters and 96-row pagination keep the entire archive reachable. Catalog/category history restoration awaits loading the correct category options.
- `public/cash-shop.css` follows the Royal Maple frames and provides red PERMANENT and grey time-limited/unconfirmed tags directly beside every pack price.
- New artwork is taken from the official announcement and served through the same-origin, fixed-Nexon-host media route. Outfit-group illustrations are labeled as illustrations, without inventing item IDs or presenting one group as an exact single-item icon.
- Quest/ETC, class progress, Lv100 controls and manual third-job previews are preserved.

## Verification

- Local build, generated JavaScript syntax, cash-shop regression, multi-build, quest and ETC regressions pass.
- Cash-shop data gate compares every original beta field, verifies counts, discounts, currencies, quantities, package contents, coupon expiry, pet life and sale dates.
- Cash-shop browser fixture covers default catalog isolation, colors/uppercase/price adjacency, filters, pagination, beta price retention, history restoration and 390/1024/1365px containment.
- Existing Visual/UI gate checks release tags and archived unavailable entries; Verify Live now verifies the deployed catalog version and both catalog counts.
- Release gate IDs, final commits and live screenshots will be recorded after deployment.
