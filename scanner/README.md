# SHOPPER scanner — first working prototype

The website owns search and shared listings. This Windows companion captures screen pixels, recognizes calibrated shop fields, and uploads listings you confirm. It does not control the game. OCR has not yet been validated on the user's client; review is required before publishing.

## Run

Use the packaged scanner folder with items.json and icons/. Install Python 3.11+ for Windows and Tesseract OCR with English language data. Tesseract's installation options are documented at https://tesseract-ocr.github.io/tessdoc/Installation.html. Run start.bat. If Tesseract is not on PATH, enter its tesseract.exe path in the app.

Load your private connection JSON. Ofri and Friend have different upload keys; never commit those files or post them publicly. The repository holds only their SHA-256 hashes. Changing or disabling a hash in market/contributors.json revokes that key after deployment. Local settings and a retryable SQLite upload queue live in %LOCALAPPDATA%/TCW-Shopper. Treat these local files as private.

## Scan a shop

1. Select the game monitor; enter the exact server/world, channel, FM room and seller/shop.
2. Open a shop. Choose Capture & calibrate. The scanner minimizes itself before capture.
3. Drag around the first visible row's item name, price and quantity. Optionally select the seller label. Enter visible row count and vertical row spacing in original screen pixels. Recalibrate if the shop moves or resolution/scaling changes.
4. Confirm whether the shop displays unit or bundle prices. Never infer this from quantity alone.
5. Start screen scanning and browse shops manually. Changed shop rows are read after two stable samples. Choose a row to review; correct item ID (duplicate names exist), exact price, quantity, actual shop slot, timestamp, and location. When scrolling, visible row 1 may be shop slot 5: correct the slot.
6. For equipment, enter actual tooltip stats as JSON and mark them recorded. Base catalog stats are not a substitute. Otherwise the website marks stats unknown.
7. Confirm & publish. The website receives structured data and a small evidence crop. Retry queued uploads after connection failures; event IDs prevent duplicates. Update seller/channel/room whenever you move.

Screenshot import is available for calibration and review. Its file modified time is only a suggested capture time; confirm the actual observation timestamp. Uploads more than 30 days old are rejected. This version does not infer room/channel changes when those labels are hidden, does not process recorded video files, and does not auto-publish unreviewed OCR. Live capture and OCR accuracy need testing with real shop screenshots before removing the review step.

## Packaging

The Windows GitHub Action builds a portable Python/Tk application. Tesseract must still be installed separately. For source runs, the release folder includes catalog and artwork. To package locally, install PyInstaller, export the catalog, and run:

```
pyinstaller --onedir --windowed --name TCW-Shopper --add-data "items.json;." --add-data "icons;icons" app.py
```

The source catalog and release images are shared with the website. Actual asking prices are written through /api/market/listings and stored in the shared Durable Object; they are never GitHub commits.
