# SHOPPER scanner — first working prototype

The website owns search and shared listings. This Windows companion captures screen pixels, recognizes calibrated shop fields, and uploads listings you confirm. It does not control the game. OCR has not yet been validated on the user's client; review is required before publishing.

## Run

For source runs, use the packaged scanner folder with items.json and icons/, install Python 3.11+ and Tesseract OCR with English language data, then run start.bat. The normal Windows ZIP already includes Tesseract and selects it automatically.

The website upload connection is included and loaded automatically. You and your friend can use the same download; each uses their own public nickname. Existing saved connections and nicknames are retained. Local settings and the retryable upload queue live in %LOCALAPPDATA%/TCW-Shopper.

## Scan a shop (automatic mode, 0.16.2)

1. Keep MapleStory.exe visible and open a shop. Start scanning; manual calibration is no longer required by default. Tesseract OCR is bundled in the Windows download and selected automatically.
2. The scanner searches the entire client image for catalog item names and nearby prices explicitly labeled Price or mesos. Results need two consistent reads before appearing. Each item keeps its own evidence crop and capture timestamp.
3. Select an offer and check the item, price, quantity and actual shop slot. Unknown quantities stay blank. More details opens automatically for missing seller, shop, channel or room. Correct these before Publish. Opening the channel chooser alone does not establish a new channel.
4. Publish confirms the listing, uploads its reviewed evidence, and adds the item-name correction to local memory. A non-exact OCR name needs three consistent confirmations of the same item before the memory helps recognize it. Conflicting corrections disable that mapping. Numbers/prices are always read fresh.
5. Greyed-out rows are treated as sold out and ignored. Active rows include the listing quantity from the `1 for 7,000 mesos` text. If no offers appear, use Settings → Troubleshooting → Import screenshot to test a shop image, or disable automatic detection under Screen setup and use Manual calibration fallback in Troubleshooting. Existing calibration is preserved.

This is an experimental text-and-layout detector, not a trained visual model. Explicit owner/seller and shop/store labels are supported; unlabeled titles or player names can require correction. Only room labels in the upper-left area and channel labels in the upper area are considered. It refuses multiple different channel values and ambiguous nearby prices. A different layout or unreadable font may yield no proposals. No full-screen images are uploaded. Gameplay recording/video-file import and automatic publishing are not implemented.

The MapleStory shop-window fallback recognises the title line at the top and the owner name in the left seller panel when those labels have no literal prefix. Visitor names in the right panel are not treated as the seller. Grey disabled text/icons are excluded using the row's rendered pixels, so sold-out offers do not enter the website. The Windows ZIP includes Tesseract and English `eng.traineddata`; no separate OCR installation is required.

Screenshot import is available for calibration and review. Its file modified time is only a suggested capture time; confirm the actual observation timestamp. Uploads more than 30 days old are rejected. Hidden room/channel labels remain unknown; this version does not process recorded video files or auto-publish unreviewed OCR. Live capture and OCR accuracy need testing with real shop screenshots before removing the review step.

## Packaging

The Windows GitHub Action builds a portable Python/Tk application and includes Tesseract in the release folder. For source runs, install Tesseract separately. To package locally, install PyInstaller, export the catalog, place a Tesseract folder at scanner/tesseract, and run:

```
pyinstaller --onedir --windowed --name TCW-Shopper --add-data "items.json;." --add-data "icons;icons" app.py
```

The source catalog and release images are shared with the website. Actual asking prices are written through /api/market/listings and stored in the shared Durable Object; they are never GitHub commits.

## Nicknames and screen context

The scanner asks for a public nickname only on first setup. This is an arbitrary alias, not your in-game name. Each confirmed listing keeps the alias used when captured/published; private uploader account IDs are not shown publicly. Change nickname only through Settings.

In calibration, select Shop title in the open shop, Channel around the channel indicator, and Top-left map label around the Free Market room text. These fixed regions are read from the same screenshot as the prices. Unreadable calibrated channel/room labels clear the candidate location instead of silently reusing an older room. Review and correct them before publishing. Location on older candidates stays attached to the original frame.

Optional cursor association: while hovering a shop sign, capture/calibrate that screen; choose Cursor anchor and click where the game pointer was, then choose Shop sign and drag around its name. This defines the offset between the pointer and visible shop label. While browsing, hold the pointer still long enough for OCR, then click the shop. The scanner observes mouse presses, associates a recent nearby label, and suggests it if an open-shop title is unavailable. The suggestion expires after 20 seconds. It does not move/click the mouse. Confirm the name: this calibration-dependent suggestion is not guaranteed identification. Multiple monitor offsets use DXcam monitor geometry.

The dashboard and SHOPPER page download the latest public Windows package. Every change under scanner/ rebuilds a versioned GitHub release and updates scanner-latest after successful checks. The public download includes a shared upload connection and bundled OCR; no connection-file or Tesseract setup is needed.

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

The packaged website connection and Tesseract OCR load automatically before first setup, including for existing installations without a key. The scanner searches the bundled OCR folder, the PyInstaller internal folder, the EXE folder, and standard Windows installation folders. The nickname prompt still appears only once. Screen calibration is optional in automatic mode. The shared credential grants listing uploads, not repository access.

## Capture dependency fix (0.14.7)

OpenCV is explicitly installed and bundled to resolve the missing cv2 error during calibration. The Windows release now runs a capture-import smoke check inside the packaged executable before publishing.

## Local learning and validation (0.15.0)

Confirmed name corrections persist in %LOCALAPPDATA%/TCW-Shopper/name-corrections.json across updates, independently of the optional GitHub example-sharing setting. Only normalized OCR item names and confirmed catalog IDs/counts are stored locally, bounded to 1,000 entries. This is correction memory, not neural-network training. Reviewed crop examples continue through the existing learning archive for future evaluation. Detection has been checked against synthetic OCR layouts and a generated image through actual Tesseract; in-game recognition still needs a real client shop capture.
