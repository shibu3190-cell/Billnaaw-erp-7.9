# Billnaw — how this is put together

```
www/
├── index.html          the shell: every view, one page
├── app.js              the original application (4,149 lines)
├── styles.css          the original stylesheet
├── billnaw.js          GENERATED — 15 modules, in order
├── billnaw.css         GENERATED — 10 stylesheets, in order
├── build.py            regenerates both from src/
├── src/                edit here
├── sw.js               offline cache
├── manifest.json       PWA install
├── icons/  screens/    launcher icons, install screenshots
└── test/run-tests.js   403 assertions
```

## The load order is the architecture

`app.js` is untouched. `billnaw.js` loads after it and patches it at runtime —
each module wraps functions defined by the modules before it. That is why the
order in `build.py` is not cosmetic.

Most of this project's bugs came from that layering, and they are worth naming
so they are not repeated:

| Bug | Cause |
|---|---|
| Three stacked checkout bars | Two were built over `#checkoutFab`, which shipped with the app |
| Camera preview invisible | `#qr-reader` sat inside a form hidden with `display:none !important` |
| Balance colour never changed | Writer used `.innerText`, reader used `.textContent` |
| Print settings silently reset | `updateIndustry()` assigns `body.className`, wiping every other class |
| Invoice printed twice | `#billing` is the one view without `class="no-print"` |

The rule that came out of it: **never hide in CSS what only JavaScript can
restore.** Every such rule is gated on a class the script sets after it has
succeeded — `.bn-ui-ready`, `.bn-shell`, `.bn-flow-ready`, `.bn-native-checkout`.
If a script fails, the original UI is still usable.

## Changing something

```bash
cd www
# edit src/billnow-*.js
python3 build.py
# bump CACHE_VERSION in sw.js
node ../test/run-tests.js
```

CI blocks a deploy if `billnaw.js` is out of sync with `src/`, if a precached
file is missing, or if a test fails.

## Known debt

`app.js` still holds the business logic and is patched from outside. Merging the
`src/` modules into it is the next structural step, and it is a real day's work:
the wrappers exist because the originals could not be edited safely without the
test suite that now exists. With 403 tests, that merge is finally low-risk.
