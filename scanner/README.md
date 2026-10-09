# SHOPPER scanner — first working prototype

The website owns search and shared listings. This Windows companion captures screen pixels, recognizes calibrated shop fields, and uploads listings you confirm. It does not control the game. OCR has not yet been validated on the user's client; review is required before publishing.

## Run

Use the packaged scanner folder with items.json and icons/. Install Python 3.11+ for Windows and Tesseract OCR with English language data. Tesseract's installation options are documented at https://tesseract-ocr.github.io/tessdoc/Installation.html. Run start.bat. If Tesseract is not on PATH, enter its tesseract.exe path in the app.

The website upload connection is included and loaded automatically. You and your friend can use the same download; each uses their own public nickname. Existing saved connections and nicknames are retained. Local settings and the retryable upload queue live in %LOCALAPPDATA%/TCW-Shopper.

## Scan a shop

1. Open MapleStory.exe; the scanner finds the game window automatically. Windia is fixed.
2. Open a shop. Choose Settings → Screen setup → Calibrate screen regions. The scanner minimizes itself before capture.
3. Drag around the first visible row's item name, price and quantity. Select the seller label, shop title, channel indicator and FM room text in the minimap once. Enter visible row count and vertical row spacing in original screen pixels. Recalibrate if the shop moves or resolution/scaling changes.
4. Confirm whether the shop displays unit or bundle prices. Never infer this from quantity alone.
5. Choose Start scanning and browse shops manually. Changed shop rows are read after two stable samples. Choose a row to review; correct item ID (duplicate names exist), exact price, quantity, actual shop slot, timestamp, and location. When scrolling, visible row 1 may be shop slot 5: correct the slot.
6. For equipment, enter actual tooltip stats as JSON and mark them recorded. Base catalog stats are not a substitute. Otherwise the website marks stats unknown.
7. Choose Publish. The website receives structured data and a small evidence crop. Retry queued uploads after connection failures; event IDs prevent duplicates. These labels are monitored automatically while scanning; confirm each captured listing before publishing.

Screenshot import is available for calibration and review. Its file modified time is only a suggested capture time; confirm the actual observation timestamp. Uploads more than 30 days old are rejected. This version does not infer room/channel changes when those labels are hidden, does not process recorded video files, and does not auto-publish unreviewed OCR. Live capture and OCR accuracy need testing with real shop screenshots before removing the review step.

## Packaging

The Windows GitHub Action builds a portable Python/Tk application. Tesseract must still be installed separately. For source runs, the release folder includes catalog and artwork. To package locally, install PyInstaller, export the catalog, and run:

```
pyinstaller --onedir --windowed --name TCW-Shopper --add-data "items.json;." --add-data "icons;icons" app.py
```

The source catalog and release images are shared with the website. Actual asking prices are written through /api/market/listings and stored in the shared Durable Object; they are never GitHub commits.

## Nicknames and screen context

The scanner asks for a public nickname only on first setup. This is an arbitrary alias, not your in-game name. Each confirmed listing keeps the alias used when captured/published; private uploader account IDs are not shown publicly. Change nickname only through Settings.

In calibration, select Shop title in the open shop, Channel around the channel indicator, and Top-left map label around the Free Market room text. These fixed regions are read from the same screenshot as the prices. Unreadable calibrated channel/room labels clear the candidate location instead of silently reusing an older room. Review and correct them before publishing. Location on older candidates stays attached to the original frame.

Optional cursor association: while hovering a shop sign, capture/calibrate that screen; choose Cursor anchor and click where the game pointer was, then choose Shop sign and drag around its name. This defines the offset between the pointer and visible shop label. While browsing, hold the pointer still long enough for OCR, then click the shop. The scanner observes mouse presses, associates a recent nearby label, and suggests it if an open-shop title is unavailable. The suggestion expires after 20 seconds. It does not move/click the mouse. Confirm the name: this calibration-dependent suggestion is not guaranteed identification. Multiple monitor offsets use DXcam monitor geometry.

The dashboard and SHOPPER page download the latest public Windows package. Every change under scanner/ rebuilds a versioned GitHub release and updates scanner-latest after successful checks. The public download includes a shared upload connection, as requested. No connection-file setup is needed. Tesseract must be installed separately.

## Nickname and scanner improvement data (0.14.2)

The automatic nickname prompt appears once on first setup. Existing saved nicknames are kept silently, including across software updates. If setup is canceled, open **Settings → Change nickname** to finish it; restarting does not ask again. Later nickname changes are available only through Settings.

**Settings → Share reviewed scanner examples** controls whether new confirmed listings include OCR readings and candidate matches. Sharing is enabled for this project by default. The same upload durably stores the reviewed item crop and your corrected item, price, quantity, shop, channel, FM room, public nickname, timestamp and observed stats. Private connection keys, full screenshots and local settings are excluded. Already queued confirmations retain their sharing choice.

The website queues examples for GitHub; an Actions workflow archives them approximately every five minutes, subject to GitHub scheduling delays. Listing updates remain immediate. See `learning/scanner/README.md` for the dataset format. These examples support later scanner evaluation and code improvements; they do not automatically train a model.

## Windia and automatic context (0.14.3)

Windia is the only world in this client and is fixed in the scanner and SHOPPER world filter. Saved world settings migrate to Windia. Calibrate the channel indicator, FM room minimap text, seller and shop title once, alongside the item rows. After Start scanning, these labels are monitored even while walking through rooms or switching channels; no repeated manual location entry is needed when the calibrated labels remain visible. Labels settle across two screen reads. Unreadable, missing or changing labels show `?` and clear old candidates instead of reusing the last shop/location.

Selecting a listing no longer pauses live tracking. Its original capture and editable review fields remain attached to that listing while the separate live-context line follows your current location. New candidates wait until you finish the selected review. A room/channel transition clears cursor shop suggestions. Calibration is still required for your resolution and client layout; this is screen OCR, not direct game-state access. Real-client OCR accuracy needs your testing.

## Simplified scanner (0.14.4)

The main screen has only **Start/Pause**, **Settings** and **Publish** buttons, a live location line, upload counts, captured items and a compact item/price/quantity review. **More details / corrections** is collapsed by default and contains channel/room/seller/shop corrections, actual shop slot, capture timestamp and observed equipment stats. Publish remains manual and is enabled when a captured row is selected.

Settings separates **General** (nickname, private connection and learning sharing), **Screen setup** (one-time calibration, monitor, row layout, price basis and OCR executable) and **Troubleshooting** (screenshot import, reading a captured frame and manual upload retry). Settings saves when closed; no main-screen Save button is needed. Start opens Settings when connection/calibration is incomplete. Calibration still matters for real OCR, so it is moved into setup rather than removed.

Counts distinguish confirmed items this session, successfully acknowledged uploads across sessions, and waiting uploads. Waiting uploads retry automatically every 30 seconds while the app is open. This never automatically confirms or publishes an unreviewed scan. Nickname persistence, Windia, continuous location tracking and reviewed learning examples are preserved.

## MapleStory.exe capture (0.14.5)

The scanner now finds the visible game window by its owning executable, `MapleStory.exe`, and automatically selects its GPU/display. It captures only the game's client area, so moving the game to another monitor does not move the calibrated OCR regions. The main screen shows the executable, PID, display, captured dimensions and live frame time. Manual monitor selection is removed.

**After this update, calibrate once in Settings → Screen setup.** Older calibration used full-monitor coordinates and cannot safely be reused for the new game-window capture. Your nickname, connection, sharing preference and upload queue are preserved. Keep the game window at the calibrated size; resizing it requires recalibration.

Start/Pause, Settings and Publish remain the only main buttons. If the game is missing, minimized, covered at the sampled visibility points or returns a black/no frame, scanning waits and reconnects automatically while showing the reason. Keep the entire game window on one monitor. With multiple MapleStory.exe processes, bring the desired game to the foreground once; otherwise the scanner keeps its previously selected instance. Channel/room/shop/seller labels now settle independently, so an unstable shop reading does not block a channel update. Mark the current channel indicator during calibration, not the entire channel-selection menu.

This is capture of visible screen pixels, not background video recording or access to game memory. Automatic source selection does not guarantee OCR accuracy: check the captured game preview during calibration and test a real channel change. Windowed/borderless mode can help if exclusive fullscreen produces black frames. Process IDs and display diagnostics remain local and are not part of learning uploads.

## Ready-to-upload download (0.14.6)

The packaged website connection loads automatically before first setup, including for existing installations without a key. The nickname prompt still appears only once. Screen calibration and Tesseract remain required. The shared credential grants listing uploads, not repository access.
