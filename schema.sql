create table orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid references auth.users default auth.uid(),
  items jsonb not null,
  total_amount numeric not null,
  status text not null
);

alter table orders enable row level security;

create policy "Users can view own orders" on orders for select using (user_id = auth.uid());
create policy "Users can insert own orders" on orders for check (user_id = auth.uid());