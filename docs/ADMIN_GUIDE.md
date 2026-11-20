# Springvilla admin guide

A plain-language guide to running the website. You don't need to be a developer.

---

## 1. Signing in

1. Type **`/admin`** after the website address (for example `https://springvilla.org/admin`). There is deliberately no link to it on the public site.
2. Enter your email and password and press **Sign in**.
3. **Super admins only:** the first time, you'll see a QR code. Scan it with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password or Authy) and type the 6-digit code. After that you'll be asked for a fresh code each time you sign in.
4. **Forgot your password?** Use the link under the sign-in button. You'll get an email with a reset link. For safety, the page says the same thing whether or not the email has an account.
5. After 5 wrong passwords in 15 minutes, the account is locked for 15 minutes. Wait, or reset your password.

What you see in the left-hand menu depends on your role. If an item is missing, you don't have permission for it.

---

## 2. Changing the hero video (top of the homepage)

Menu: **Website → Hero video**

1. **Poster image**: click *Choose image* and upload a still frame (1920×1080). This shows instantly while the video loads, and it is all that phones see unless you switch on the mobile video. **Add alt text** in the Media library first (see section 4).
2. **Desktop video (MP4)**: a 10–20 second loop, 1080p, H.264, **under 10MB**.
3. **Desktop video (WebM)**: optional, slightly smaller for some browsers.
4. **Mobile video**: 720p MP4 **under 4MB**. Only played if you tick *Play the mobile video on phones*. Leaving it off keeps the site fastest.
5. **Overlay strength**: drag until the headline is easy to read over the brightest part of the video.
6. Edit the headline, the highlighted word (shown in green italic), the supporting text and the two buttons.
7. Press **Save draft**, check the **Preview** on the right (switch between desktop and phone), then press **Publish**. The live homepage updates within seconds.

**Tips**
- Files over 15MB get a warning. The free storage plan stops single files at 50MB.
- Never put words in the video itself. The headline is real text so it is readable, translatable and searchable.
- The video never plays sound. Visitors can pause it, and it stops when they scroll away.
- If there's no video, the poster shows. If there's no poster either, an abstract green background shows. It's never broken.

---

## 3. Editing words, buttons and images on any page

Menu: **Website → Site content**

1. Choose a page.
2. On the left is the list of sections in order:
   - **Drag** the handle (⋮⋮) to reorder. You can also focus the handle and use **Space**, then the **arrow keys**. Reordering publishes immediately.
   - The **eye icon** hides or shows a section on the live site.
   - *Unpublished changes* means a draft is waiting.
3. Click a section to edit it. Every heading, paragraph, button label, button link, image, list item and colour layer is here.
   - **Highlighted word**: one word from the heading to show in the serif italic accent.
   - **New line** in a heading: press Enter to choose exactly where the line breaks.
   - **Colour layer**: the brand colour pair for the section. The site automatically keeps text readable on it.
4. **Save draft** keeps your work without changing the live site, and the preview on the right shows it.
5. **Publish** puts it live (within seconds).
6. **History** shows every published version. **Restore** puts an old version back live in one click.
7. **Search & sharing (SEO)** at the top of the page sets the Google title, the description and the image shown when the page is shared.

If you try to leave with unsaved changes, you'll be warned first.

**Truth rules (important)**: only publish facts you have checked. No invented numbers, counts, earnings, testimonials or people. Sections with empty fields hide themselves, so leaving something blank is always safe.

---

## 4. Photos, videos and the Media library

Menu: **Website → Media library**

- **Upload**: drag files onto the box, or click *Choose files*. A progress bar shows each file. Photos are automatically converted into fast, smaller versions.
- **Alt text is required** before a photo can be used anywhere. Describe what the photo shows for people who can't see it, for example *"Two members presenting a website design to their peers."*
- **Caption**: say what actually happened. Captions appear on the homepage mosaic and in galleries.
- **Consent confirmed**: tick only when everyone identifiable has agreed to the photo being used publicly.
- **Replace file**: upload a new version. Every page using the photo updates automatically.
- **Where this file is used**: shows every page using it. You can only delete a file that isn't used anywhere (central admins only).
- Only use real photos of real Springvilla people and places, with consent. Never stock or AI images presented as Springvilla.

---

## 5. Publishing an article

Menu: **Stories & Ideas → Articles → New article**

1. Fill in the title, summary, category, tags and cover image, and write the article. The editor toolbar has headings, lists, quotes, links and images (from the Media library).
2. Add 2–3 **Key takeaways**.
3. Workflow (set *Status*):
   - **Idea → Draft → In review → Claims review**: anyone with the Blog editor role.
   - **Claims review** means a central admin checks every fact and claim. No income, job or health promises.
   - **Approved → Scheduled or Published**: central admins only. For *Scheduled*, set the publish date and time, and the article goes live then.
4. **Open preview** (right-hand panel) shows the article before it's published.
5. Categories and tags are managed with the buttons at the top of the Articles list.

**Journeys** (Stories & Ideas → Journeys) need a **consent record** (create one under *Consent records* and upload the signed form) and the *verified* box ticked before they can be published. Use **Add dated update** to add milestones to the timeline. If consent is withdrawn, tick *Consent has been withdrawn* on the consent record and the linked journeys are unpublished automatically.

**News** and **Events** work the same way. Event times are entered in the event's own timezone.

---

## 6. Offices

Menu: **People → Offices**

- Office pages have a welcome, what happens there, programmes, first-visit information, opening hours, contacts, a map pin, photos and a gallery.
- **Office admins** can edit their own office. Changes to the name, address, phone, email, WhatsApp or map pin are **sent to a central admin for approval** instead of going live straight away.
- **Central admins** see *Changes waiting for approval* and press **Approve changes & verify**. The office page then shows "Details verified" with the date. Use *Mark details verified today* after a routine check.
- Visitors can use **Report incorrect details** on every office page. Those reports arrive in the inbox as *Feedback*.

---

## 7. Handling applications and enquiries

Menu: **People → Applications & enquiries**

- Two tabs: **Join applications** and **Contact enquiries**. Office admins only see their own office.
- Filter by status, office, interest or type, and date.
- Click a name to open the details:
  - **Status**: New → Contacted → Visited → Closed.
  - **Assigned to**: who is following up.
  - **Internal notes**: only staff see these, and each note is signed and dated.
- **Export CSV** downloads what you're currently filtering (opens in Excel or Google Sheets).
- Remember: an enquiry is not membership. Please reply to new applications within a few days.

---

## 8. Reading analytics

Menu: **Insight → Analytics** (central admins)

- Choose a period: Today, 7, 30 or 90 days, or your own dates.
- **Page views** counts everyone. **Visitors** and the detailed charts only count people who clicked *Accept analytics* in the cookie banner. No names, emails or IP addresses are ever stored.
- **Join funnel**: visited the join page → started the form → submitted, with percentages.
- **Hero video play rate**: phones without the mobile video, data-saver and reduced-motion visitors see the poster, so it is never 100%.
- **Button clicks**: which calls-to-action people use.
- **Export CSV** for your own reports.
- To see Core Web Vitals (speed), switch on *Vercel Web Analytics & Speed Insights* in Settings and look in the Vercel dashboard.

---

## 9. Menus, footer and settings

Menu: **Website → Navigation & settings**

- Logo (upload the official file unchanged), contact details, social links (a link only appears when its URL is filled), header menu, footer site map, legal links, footer closing statement and disclaimers, default SEO, timezone, newsletter, the cookie banner text and the analytics switches.
- Press **Save all settings**. The site updates within seconds.

---

## 10. Users and roles

Menu: **People → Users & roles** (super and central admins)

- **Invite**: enter an email, choose a role (and an office for office admins and members), then press *Send invitation*. They get an email to set their password.
- **Add / remove roles** on any person. Only super admins can create other super admins.
- **Deactivate** stops someone signing in, without deleting their history.

| Role | Can do |
|---|---|
| Super admin | Everything (needs an authenticator app) |
| Central admin | Everything except creating super admins |
| Office admin | Their office's page, events, announcements and inbox |
| Blog editor | Articles up to Claims review |
| Story editor | Journeys and consent records |
| Events editor | Events and news |
| Training admin | Courses, lessons, resources and member announcements |
| Member support | All applications, enquiries and member support requests |
| Member | The member area only |

---

## 11. Members area

Members sign in at **`/login`** (linked in the site header). They see their office, announcements (with read status), events, private resources, courses with progress, support requests, and their profile and privacy settings. Manage these from **Members → Courses / Announcements / Resources**.

---

## 12. Audit log

Menu: **Insight → Audit log**. Every change made in the admin is recorded: who, what, when, and before/after values. Use it to answer "who changed this?".

---

## Deploying (for whoever manages hosting)

1. Push the repository to GitHub.
2. In **Vercel → Add New → Project**, import the repository. The framework preset is Next.js and the defaults are fine.
3. Under **Environment Variables**, add everything from `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` = your real domain, `ANALYTICS_SALT`). `DATABASE_URL` and `SUPER_ADMIN_EMAIL` are only needed on your own computer for the setup scripts.
4. Press **Deploy**.
5. **Settings → Domains**: add your domain and follow the DNS instructions.
6. In Supabase, **Authentication → URL Configuration**: set the Site URL to your domain and add `https://<your-domain>/auth/callback` to the Redirect URLs.
7. Optional: in Vercel enable **Analytics** and **Speed Insights**, then switch them on in the admin settings.
8. Optional: schedule `select public.analytics_prune();` daily (Supabase → Database → Cron) to delete raw analytics older than 13 months.
