MATH TRADERS WEBSITE — NETLIFY DEPLOY PACKAGE

What this package does
- Keeps the existing 23 review screenshot cards in index.html.
- Adds a Netlify Function that saves new student text reviews in Netlify Blobs.
- Loads saved text reviews automatically into the same Reviews gallery.
- Uses the existing review form fields: name, course, rating, contact, review.
- New reviews are public immediately after submission (as requested). Consider moderation/anti-spam before advertising the form.

HOW TO DEPLOY
1. Extract this ZIP on your computer. You should see index.html, package.json, netlify.toml, and netlify/functions/reviews.mjs.
2. Deploy the ENTIRE extracted project folder to your existing Netlify site. Do not upload index.html alone; the function and package files are required.
3. On Netlify, open your existing Math Traders site and deploy the folder using the manual deploy area, or connect this folder to Git and deploy from Git.
4. Wait for the deploy to finish.
5. Open the live website and submit a test review. Confirm the success message appears.
6. Refresh the site; the new text review should still appear in the gallery. Open See More if needed.

IMPORTANT
- This uses Netlify Blobs persistent storage; deploy as a Netlify site with Functions enabled.
- Existing 23 screenshot reviews remain embedded in index.html. The new text reviews are saved separately and appended automatically.
- Do not put any private API keys in the HTML.
- If the site is currently connected to Git, do not drag-and-drop a manual deploy as it may not become the active production deploy; commit these files to the connected repository instead.
