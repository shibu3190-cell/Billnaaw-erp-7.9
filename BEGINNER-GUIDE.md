# Getting BillNow running in your shop

No programming. About 30 minutes to a working app, then a few hours of typing
your items in.

Do these in order. If a step doesn't work, stop there — skipping ahead makes it
harder to find what went wrong.

---

## Step 1 — Download and unzip

1. In this chat, click **BillNow-App.zip**. It goes to your **Downloads**
   folder.
2. Find it there.
   - **Windows:** right-click → *Extract All* → *Extract*
   - **Mac:** double-click it
   - **Android:** open Files → Downloads → tap the zip → *Extract*
3. You now have a folder called **BillNow**. Open it. You should see
   `index.html`, `app.js`, and a `START-HERE.txt`.

**Do not rename anything inside this folder.** The files find each other by
name.

---

## Step 2 — Put it online

Your phone needs an address starting with `https://`. A Bluetooth printer will
not connect otherwise — that is a browser rule, not a setting you can change.
This is why you cannot just email the files to yourself.

1. On your computer, open **https://app.netlify.com/drop**
2. Drag the whole **BillNow** folder onto the page. Not the files inside it —
   the folder itself.
3. Wait about 10 seconds.
4. It gives you a link like `https://calm-otter-1a2b3c.netlify.app`

**Write that link down.** No account needed.

> That link is public. Anyone with it can open the app — but not your data,
> which stays on your own phone. Still, treat the link as private.

---

## Step 3 — Install it on your phone

1. Open the link in **Chrome on Android**. (iPhone works for billing but
   **cannot** do Bluetooth printing — that's an Apple limitation.)
2. Chrome menu (⋮) → **Install app** or **Add to Home screen**
3. Close Chrome. Open BillNow from the icon on your home screen.

It should fill the screen with no address bar. That means it installed
properly.

**Test it works offline:** turn on aeroplane mode and open the app. It should
still open. If it does, you're set — a power cut or dead internet won't stop
billing.

---

## Step 4 — Set up your shop

Inside the app, tap **Settings**:

- Shop name, address, phone
- GSTIN, if you have one
- UPI ID, so a payment QR prints on the bill
- Print Format: **80mm Thermal** for a receipt printer, **A4** for a laser printer

Tap **Save**.

---

## Step 5 — Connect your printer

Settings → **Bluetooth Printer** → **Pair / Connect** → pick your printer.

Then tap **Print Test Receipt**. Do this *before* your first real bill.

Check the printed paper:
- Is the shop name readable?
- Do the item, quantity and amount columns line up?
- Does the QR code scan with a UPI app?

**If it says "no printable channel":** your printer is an older Bluetooth type
that no web app can reach. Not a bug you can fix. Options: use a different
printer, or set Settings → *When billing* → **Never**, and print through the
normal Android print dialog instead.

---

## Step 6 — Add your items

This is the real work, and nobody warns you about it. 300 items is roughly half
a day of typing.

**Do 20 items first.** Your fastest-moving ones. Bill with those for two days
before entering the rest — if something about the item form annoys you, you
want to find out at item 20, not item 300.

For each item: name, purchase cost, selling price, GST %, current stock.

---

## Step 7 — Cut your first bill

Billing → search an item → set quantity → **Add** → repeat → **Save & Print**.

Then check three things:
- The printed total matches what's on screen
- The item's stock went down by what you sold
- The bill shows up in Bill History

---

## Step 8 — Backups. This is the one that matters.

**Your data lives on the phone. Only on the phone.** Clear the browser data,
lose the phone, or drop it in water, and your entire ledger is gone. There is
no server holding a copy.

**Every Sunday:** Settings → **Backup** → it saves a file. Put that file
somewhere else — email it to yourself, or drop it in Google Drive. A backup
sitting on the same phone protects you from nothing.

**Once a month**, prove a backup works: open the app on a different phone or a
computer browser, use **Restore**, and check your bills are there. A backup you
have never restored is not a backup.

---

## When something goes wrong

| What you see | What to do |
|---|---|
| App won't open offline | Reinstall from Step 3 — the first install didn't finish |
| Printer won't connect | Bluetooth on? Printer on and in range? Try Disconnect then Pair again |
| Printed text is cut off at the edge | Settings → check 58mm vs 80mm matches your paper |
| Stock number looks wrong | Bill History → find the bill → **Reverse** (not Delete) |
| Blank white screen | Close and reopen from the home icon. If it persists, reinstall |

**Reverse vs Delete:** Reverse puts the stock back and corrects the customer's
balance. Delete only removes the record and leaves everything else wrong.
Use Reverse.

---

## After two weeks of real billing

Write down every moment the app slowed you down or annoyed you. Be specific:
*"searching for an item takes too long once there are 200"*, not *"make it
better"*.

That list is worth more than any feature anyone can guess at — including me.
