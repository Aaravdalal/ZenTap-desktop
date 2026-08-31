# ZenTap browser extension

Closes tabs for the sites on your ZenTap list while a session is running, and
reports per-site time back to the desktop app.

## Why it exists

Without an extension, the only URL signal available on Windows is the browser's
window title, so site time can only be guessed at and blocking has to go through
a system proxy. The proxy works, but it is a sharp edge: if ZenTap is killed
rather than closed, Windows is left pointing at a proxy that is no longer
listening and **no website loads in any browser** until the setting is cleared.

With the extension installed:

- A blocked site's tab is closed the moment it tries to navigate.
- ZenTap skips the system proxy entirely, so it can never strand your
  connection.
- Site time is exact: real hostnames, real seconds, per tab.

## Install (unpacked)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and choose this `extension/` folder.
4. Open ZenTap. The toolbar icon gains a **green outline** once the extension
   can see the app.

Repeat in each browser you use — an extension only sees its own browser.

## The toolbar icon is the status

There is no popup. The icon is ZenTap's own app icon:

| Icon | Meaning |
| --- | --- |
| Plain | The desktop app isn't running. Nothing is blocked. |
| Green outline | Connected to ZenTap. |

Hovering names the state too.

## Blocking

A navigation to a listed site closes its tab (`webNavigation.onBeforeNavigate`,
top-level frames only), and a `declarativeNetRequest` block rule stops the
request itself so nothing renders in the moment before the tab goes. Subdomains
count: `youtube.com` also covers `m.youtube.com`.

**If the blocked tab is the only tab, closing it closes that browser window.**
That is what "close the tab" means to the browser; there is no way to close a
tab and keep an empty window.

## How it talks to the app

ZenTap runs a small HTTP server on `127.0.0.1:8791`, loopback only, which
refuses requests that don't come from an extension origin.

| Route | Direction | Purpose |
| --- | --- | --- |
| `GET /v1/state` | extension → app | The block list and whether a session is running |
| `POST /v1/usage` | extension → app | Batched `{host, seconds}` for the statistics screens |
| `POST /v1/blocked` | extension → app | A tab was actually closed (Pick Up Prevention) |

The extension polls every 30 seconds — the shortest period MV3 alarms allow.
Time itself is measured from tab, window-focus and idle events rather than a
timer, because an MV3 service worker is unloaded when idle and a short timer
would not survive.

## Failure behaviour

If the app is closed or unreachable, the extension **clears its block list and
rules** and keeps unreported time for later. A closed app can never start
closing tabs on its own.
