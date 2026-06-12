// api/create-checkout-session.js
// Creates a Stripe Checkout session for the 50% deposit.
//
// SECURITY: the amount charged is calculated HERE, on the server, from the
// package type + the selected dates. Any price the browser sends
// (total / deposit / basePrice) is ignored, so it can't be tampered with.

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ---- Pricing: the single source of truth. Update prices HERE. ----
const PACKAGES = {
  microwedding: { name: 'Microwedding', basePrice: 2750, minNights: 2, maxNights: null },
  classic: { name: 'Classic Weekend', basePrice: 4000, minNights: 2, maxNights: 2 },
  grand: { name: 'Grand Weekend', basePrice: 5000, minNights: 3, maxNights: null },
};
const EXTRA_NIGHT_RATE = 399; // per night beyond the package minimum
const DEPOSIT_PERCENT = 0.50;

// Count nights from the two YYYY-MM-DD strings (don't trust a client-sent count).
function nightsBetween(checkIn, checkOut) {
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  if (isNaN(start) || isNaN(end)) return null;
  const diff = Math.round((end - start) / 86400000);
  return diff > 0 ? diff : null;
}

export default async function handler(req, res) {
  // CORS (Squarespace and Vercel are different origins, so the browser needs these)
  res.setHeader('Access-Control-Allow-Origin', '*'); // can lock to your domain later
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      checkIn,
      checkOut,
      packageType,
    } = req.body;

    // Validate required fields
    if (!email || !checkIn || !checkOut || !packageType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ---- Server-side price calculation (browser amounts are ignored) ----
    const pkg = PACKAGES[packageType];
    if (!pkg) {
      return res.status(400).json({ error: 'Invalid package' });
    }

    const nights = nightsBetween(checkIn, checkOut);
    if (!nights) {
      return res.status(400).json({ error: 'Invalid dates' });
    }
    if (nights < pkg.minNights) {
      return res.status(400).json({ error: `${pkg.name} requires at least ${pkg.minNights} nights.` });
    }
    if (pkg.maxNights && nights > pkg.maxNights) {
      // Classic is capped at 2 nights — a 3rd night should book the Grand Weekend.
      return res.status(400).json({ error: `${pkg.name} is limited to ${pkg.maxNights} nights. Please choose the Grand Weekend.` });
    }

    const extraNights = Math.max(0, nights - pkg.minNights);
    const extraNightsCost = extraNights * EXTRA_NIGHT_RATE;
    const total = pkg.basePrice + extraNightsCost;
    const deposit = Math.round(total * DEPOSIT_PERCENT);

    // Create the checkout session — charge the SERVER-computed deposit
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${pkg.name} - 50% Deposit`,
              description: `${nights} nights: ${checkIn} to ${checkOut}`,
            },
            unit_amount: Math.round(deposit * 100), // cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        firstName: firstName || '',
        lastName: lastName || '',
        phone: phone || '',
        checkIn,
        checkOut,
        nights: nights.toString(),
        packageName: pkg.name,
        packageType,
        basePrice: pkg.basePrice.toString(),
        extraNights: extraNights.toString(),
        extraNightsCost: extraNightsCost.toString(),
        totalPrice: total.toString(),
        depositAmount: deposit.toString(),
      },
      success_url: `${process.env.SITE_URL}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL}/availability`,
    });

    res.status(200).json({ sessionUrl: session.url });

  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
