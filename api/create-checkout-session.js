// api/create-checkout-session.js
// This endpoint creates a Stripe Checkout session for the deposit payment

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Handle CORS preflight
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
      nights,
      package: packageName,
      packageType,
      basePrice,
      extraNights,
      extraNightsCost,
      total,
      deposit
    } = req.body;

    // Validate required fields
    if (!email || !checkIn || !checkOut || !deposit) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create line items for the checkout
    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${packageName} - 50% Deposit`,
            description: `${nights} nights: ${checkIn} to ${checkOut}`,
          },
          unit_amount: Math.round(deposit * 100), // Stripe uses cents
        },
        quantity: 1,
      }
    ];

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: lineItems,
      metadata: {
        firstName,
        lastName,
        phone,
        checkIn,
        checkOut,
        nights: nights.toString(),
        packageName,
        packageType,
        basePrice: basePrice.toString(),
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
