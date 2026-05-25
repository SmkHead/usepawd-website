# usepawd.com

Landing page for **pawd.** — a personality-driven pet adoption iOS app.

Built with plain HTML + CSS + vanilla JS. No build step, no framework, no dependencies beyond Google Fonts.

## Files

```
index.html     landing page
about.html     about & mission
privacy.html   privacy policy
terms.html     terms of service
style.css      shared styles
```

## Deploy to Vercel (drag and drop)

1. Go to [vercel.com](https://vercel.com) and sign in
2. From the dashboard, click **Add New → Project**
3. Choose **"deploy without a Git repository"** (or drag the folder directly onto the dashboard)
4. Drag this entire folder into the upload zone
5. Vercel will detect it as a static site — no settings to change
6. Click **Deploy**
7. In **Settings → Domains**, add `usepawd.com` and follow the DNS instructions

That's it. No build configuration needed.

## Plug in the Formspree endpoint

The email capture form on `index.html` uses Formspree. To activate it:

1. Go to [formspree.io](https://formspree.io) and create a free account
2. Create a new form — set the notification email to `hello@usepawd.com`
3. Copy your form endpoint (looks like `https://formspree.io/f/abcdefgh`)
4. Open `index.html` and find this line:

```html
action="https://formspree.io/f/YOUR_FORM_ID"
```

5. Replace `YOUR_FORM_ID` with your actual form ID

The form already handles success/error states in JS — no additional setup needed.

## Swap in the App Store link

When pawd. is live on the App Store:

1. Open `index.html`
2. Find the `.appstore-placeholder` div near the bottom of the hero section
3. Replace it with a real App Store badge link:

```html
<a href="https://apps.apple.com/app/idYOUR_APP_ID" target="_blank" rel="noopener">
  <img src="appstore-badge.svg" alt="download on the app store" height="44" />
</a>
```

Apple's official App Store badge SVG can be downloaded from the
[Apple Marketing Guidelines](https://developer.apple.com/app-store/marketing/guidelines/) page.

## Domain & email

- Domain: `usepawd.com`
- Business email: `hello@usepawd.com` via Google Workspace

Once DNS is pointed at Vercel, add the domain in **Vercel → Settings → Domains**.
Google Workspace MX records and Vercel's A/CNAME records can coexist — just add both sets to your DNS provider.
