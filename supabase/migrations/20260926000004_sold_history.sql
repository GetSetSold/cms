-- Sold / Leased / Purchased history — manually managed by staff, permanent
-- record of closed deals. Lives in the CMS's own database (not the MLS
-- project) since this data needs real write access from the admin, unlike
-- the read-only DDF sync feed.

create table public.sold_history (
  id           uuid primary key default gen_random_uuid(),
  status       text not null check (status in ('sold', 'leased', 'purchased')),
  address      text not null,
  price        numeric,
  listed_price numeric,
  image_url    text,
  link         text,
  bed          int,
  bath         int,
  parking      int,
  sqft         int,
  listing_key  text,          -- optional — kept for reference only, not synced
  closed_at    timestamptz not null default now(),
  sort_order   int not null default 0,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.sold_history (status, closed_at desc);

create trigger t_sold_history before update on public.sold_history for each row execute function public.touch_updated_at();

alter table public.sold_history enable row level security;
create policy "read sold history" on public.sold_history for select using (true);
create policy "manage sold history" on public.sold_history for all
  using (public.has_role(array['admin','editor']::public.app_role[]))
  with check (public.has_role(array['admin','editor']::public.app_role[]));

-- One-time import of the real manually-entered records only. The DDF-sync
-- rows (status: 'For Sale' / 'For Lease' / 'Off Market', source: 'ddf_sync')
-- were leftover noise from an old sync attempt on the other table and are
-- deliberately excluded. Status casing normalized to lowercase; a few
-- addresses had stray <br> tags / embedded newlines, cleaned here.
insert into public.sold_history (status, address, price, listed_price, image_url, link, bed, bath, parking, sqft, closed_at) values
('sold', '48 Helen Dr E, Hagersville', 669900, 669900, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/48-Helen.jpg', null, null, null, null, null, '2025-06-16 23:16:33.934629+00'),
('sold', '223 Erindale Ave, Hamilton', 744000, 764900, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/223-Erindale.jpg', null, null, null, null, null, '2025-06-16 22:24:43.819115+00'),
('purchased', '19 Brighton Lane, Thorold', 934900, 934900, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/19-Brighton.png', null, null, null, null, null, '2025-07-25 18:30:24.5204+00'),
('leased', '43 Granville Cres, Caledonia', 2550, 2600, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/43-Granville.jpg', null, null, null, null, null, '2025-06-20 14:31:18.633776+00'),
('leased', '55 Norwich Cres, Caledonia', 2650, 2650, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/55-Norwich.jpg', null, null, null, null, null, '2025-06-16 23:27:45.674125+00'),
('sold', '94 Sundin Dr S, Caledonia', 850000, 879000, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/94-Sundin.jpg', null, null, null, null, null, '2025-06-16 22:34:33.127145+00'),
('purchased', '72 Narbonne Cres, Stoney Creek', 825000, 834900, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/72-Narbonne.jpg', null, null, null, null, null, '2025-06-16 23:50:43.147222+00'),
('leased', '37 Sundin Dr, Caledonia', 3000, 3000, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/37-Sundin.jpg', null, null, null, null, null, '2025-06-17 00:36:49.595014+00'),
('leased', '12 Basswood Cres, Caledonia', 2999, 2999, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/12-Basswood.jpg', null, null, null, null, null, '2025-06-16 23:38:56.791759+00'),
('leased', 'Caledonia, ON', 0, 1850, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/81-Larry-Cres.jpg', 'https://www.getsetsold.ca/tenant-screening', 2, 1, 1, 800, '2026-05-10 19:25:44.28786+00'),
('leased', 'Empire Community, Caledonia — Available Jan 1, 2026', null, 1450, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/WhatsApp%20Image%202025-11-26%20at%205.18.17%20PM-2.jpeg', 'https://www.getsetsold.ca/tenant-rental-process', 1, 1, 1, 700, '2025-11-27 16:28:08.462722+00'),
('leased', '78 Norwich Cres, Caledonia', 2600, 2600, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/78-Norwich.png', 'http://getsetsold.ca/tenant-screening', null, null, null, null, '2025-07-16 22:59:43.700367+00'),
('sold', '420-1210 Thorpe Rd, Burlington', 600000, 579900, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/420-1210-Thorpe.webp', null, null, null, null, null, '2025-06-17 19:36:28.126282+00'),
('leased', '142 Lilac Circle, Caledonia ON — Available From July 15, 2026', null, 2950, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/142-Lilac-Circle.JPG', 'https://www.getsetsold.ca/tenant-screening', 4, 3, 3, 1863, '2026-03-23 02:15:08.710907+00'),
('sold', '41 Oaktree Dr, Caledonia', 740000, 754999, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/41-Oaktree.jpg', null, null, null, null, null, '2025-06-13 01:54:49.494595+00'),
('leased', '75 Norwich Cres, Caledonia', 2450, 2550, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/75-Norwich.jpg', null, null, null, null, null, '2025-06-16 23:59:50.750318+00'),
('leased', '635 Windwood Dr, Binbrook', 3400, 3400, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/635-Windwood.jpg', null, null, null, null, null, '2025-06-17 19:54:45.301005+00'),
('leased', '3 Kensington Road, Haldimand, Ontario N3W0J9', 2300, 2300, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/3-kensington-road-haldimand.jpeg', 'https://www.getsetsold.ca/real-estate/29205326/3-kensington-road-haldimand', 3, 2, 2, 1355, '2025-12-29 17:40:54.456189+00'),
('sold', '122 Sundin Drive, Caledonia', 740000, 779000, 'https://pub-3125bc45dff549f191f0217a3abc4dd1.r2.dev/122-Sundin-Dr.png', 'https://getsetsold.ca/contact', 4, 3, 5, 2050, '2025-09-07 19:24:08.447838+00');
