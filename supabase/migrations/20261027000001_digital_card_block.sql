-- Digital card block — one-screen agent card for /rohit-sharma-realtor
-- (short share link /rohit redirects to it; see next.config.ts).
-- Card shell only: Featured / Sold / Google Reviews (custom_code) stay as
-- separate blocks on the same page, edited in Page Builder.
INSERT INTO block_types (key, name, category, is_active, default_data)
VALUES (
  'digital_card',
  'Digital Card',
  'content',
  true,
  '{"name": "Rohit Sharma", "role": "REALTOR® · Caledonia & Haldimand County", "brokerage": "Lombard Group Real Estate Brokerage Inc.", "tagline": "Local Roots. Global Reach.", "handle": "@getsetsold", "photo_url": "", "phone": "", "email": "", "address": "", "hours": "", "share_url": "https://www.getsetsold.ca/rohit", "canonical_url": "https://www.getsetsold.ca/rohit-sharma-realtor", "proof_points": [{"value": "5.0★", "label": "65 reviews"}, {"value": "1%", "label": "to sell"}, {"value": "$5,000", "label": "back to buy"}], "services": [{"label": "Buy", "title": "Buying A Home?", "body": "Join our VIP Buyer Program to get up to $5,000 cash back at closing, priority showings that fit your schedule, and a complimentary 1-on-1 free buyer consultation.", "whatsapp_message": "Hi Rohit, I am looking to buy a home."}, {"label": "Sell", "title": "Selling Your Home?", "body": "Seller Success Program full-service with professional home marketing, and skilled negotiation — all for just a 1% listing fee.", "whatsapp_message": "Hi Rohit, I am looking to sell my home."}, {"label": "Lease out", "title": "Rent Your Property?", "body": "Rent out your property with confidence. We help landlords find reliable tenants, handle marketing, and manage showings—so you can lease faster and smarter.", "whatsapp_message": "Hi Rohit, I am looking to lease out my property."}, {"label": "Rent", "title": "Tenant Rental Services", "body": "Our Full Rental Assistance From Showings To Paperwork Is Completely Free For Tenants. You Don’t Pay Us A Cent; We’re Compensated By The Landlord", "whatsapp_message": "Hi Rohit, I am looking to rent a home."}, {"label": "Invest", "title": "Real Estate Investments", "body": "Explore a wide range of investment options, including residential, commercial, and rental properties, tailored to your investment preferences.", "whatsapp_message": "Hi Rohit, I am looking at investment properties."}, {"label": "Refer", "title": "Refer A Friend", "body": "Earn Up To $500 In Referral Rewards. Trusted Real Estate Service With A Referral Program Designed To Say Thank You. Great Connections Deserve Great Rewards.", "whatsapp_message": "Hi Rohit, I would like to refer someone."}]}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  is_active = true;
