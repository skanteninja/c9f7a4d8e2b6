# Reviewed scanner examples

The scanner attaches original OCR readings and candidate matches to confirmed listings when **Settings → Share reviewed scanner examples** is enabled. The website stores sanitized examples durably alongside the upload; retrying a listing cannot duplicate an example. GitHub Actions archives them here approximately every five minutes (scheduled runs can be delayed).

Each JSON file contains the scanner version, original readings, candidate scores, confirmed item ID, price, quantity, price basis, shop, channel, FM room, timestamp, public nickname and observed stats. Its optional JPEG/PNG is the same reviewed item-row crop used as listing evidence. Full screenshots, private connection keys, uploader authentication IDs, machine identifiers and local settings are excluded. Existing queued examples remain shared if sharing is subsequently disabled; new confirmations omit them.

These are human-reviewed observations, not guaranteed ground truth. We can read and compare them later to measure OCR and matching errors and improve calibration, parsing and matching code. Collecting examples does not automatically train an AI model or change the scanner. Ship changes only after evaluating them with regression tests and real examples.

`cursor.json` records the last archived sequence. The API exposes only this reviewed public dataset at `/api/market/learning`; submitting data requires the existing private scanner key. Credentials stay on the scanner computer. The scheduled workflow uses GitHub's own temporary token to commit files, so no GitHub token is distributed in the executable.
