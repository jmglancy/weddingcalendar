# Wedding Venue Backend - Vercel Setup Guide

This backend provides two API endpoints for your wedding venue calendar:
1. **Calendar Sync** - Automatically fetches blocked dates from VRBO and Airbnb
2. **Stripe Checkout** - Handles deposit payments

---

## Step-by-Step Setup

### 1. Create a Vercel Account (Free)

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Sign up with your GitHub account (easiest) or email

---

### 2. Install Vercel CLI (Optional but Recommended)

Open your terminal/command prompt and run:

```bash
npm install -g vercel
```

---

### 3. Deploy to Vercel

**Option A: Using the Vercel Dashboard (Easiest)**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Upload" and drag the entire `vercel-backend` folder
3. Vercel will automatically detect the configuration
4. Click "Deploy"

**Option B: Using the CLI**

1. Open terminal in the `vercel-backend` folder
2. Run:
   ```bash
   vercel
   ```
3. Follow the prompts (accept defaults)
4. Your site will be deployed to something like `wedding-venue-backend.vercel.app`

---

### 4. Add Environment Variables

After deploying, you need to add your Stripe secret key:

1. Go to your Vercel dashboard
2. Click on your project
3. Go to "Settings" → "Environment Variables"
4. Add these variables:

| Name | Value |
|------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_your_key_here` (from Stripe Dashboard → Developers → API keys) |
| `SITE_URL` | Your Squarespace website URL (e.g., `https://yourweddingvenue.com`) |

5. Click "Save"
6. Go to "Deployments" and click the three dots → "Redeploy" to apply the variables

---

### 5. Test Your Endpoints

Once deployed, test that everything works:

**Test Calendar Sync:**
```
https://your-project.vercel.app/api/get-blocked-dates
```
You should see a JSON response with your blocked dates.

**Test Stripe (will fail without a POST body, but confirms it's working):**
```
https://your-project.vercel.app/api/create-checkout-session
```
Should return: `{"error":"Method not allowed"}` for a GET request (this is correct!)

---

### 6. Update Your Squarespace Calendar Code

Once your Vercel backend is live, update the calendar code with your endpoints:

Find this section near the top of the calendar HTML:

```javascript
const CONFIG = {
  stripePublishableKey: 'YOUR_STRIPE_PUBLISHABLE_KEY',
  checkoutEndpoint: '/api/create-checkout-session',
  ...
```

Change it to:

```javascript
const CONFIG = {
  stripePublishableKey: 'pk_live_your_actual_key_here',
  checkoutEndpoint: 'https://your-project.vercel.app/api/create-checkout-session',
  calendarSyncEndpoint: 'https://your-project.vercel.app/api/get-blocked-dates',
  ...
```

---

## Your Vercel URL

After deployment, your URL will be something like:
```
https://wedding-venue-backend.vercel.app
```

Your API endpoints will be:
- `https://wedding-venue-backend.vercel.app/api/get-blocked-dates`
- `https://wedding-venue-backend.vercel.app/api/create-checkout-session`

---

## Troubleshooting

**Calendar not syncing?**
- Check the Vercel function logs: Dashboard → Your Project → Functions → View Logs
- Make sure your iCal URLs are correct and accessible

**Stripe checkout not working?**
- Verify your `STRIPE_SECRET_KEY` environment variable is set
- Make sure you're using the correct key (test vs live)
- Check the Vercel function logs for errors

**CORS errors?**
- The `vercel.json` file should handle this automatically
- Try redeploying after any changes

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Stripe Docs: https://stripe.com/docs
