-- ============================================================
-- WIGSMI SCHEMA — Slice 2
-- ============================================================

-- Role enum
CREATE TYPE public.app_role AS ENUM ('consumer', 'retailer', 'admin');

-- ----- PROFILES -----
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ----- USER ROLES (separate table — security critical) -----
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security-definer helper to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ----- CONSUMER PROFILES -----
CREATE TABLE public.consumer_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  skin_tone SMALLINT CHECK (skin_tone BETWEEN 1 AND 6),
  face_shape TEXT,
  lifestyle TEXT[] DEFAULT '{}',
  style_vibe TEXT[] DEFAULT '{}',
  budget TEXT,
  try_on_count_this_month INTEGER NOT NULL DEFAULT 0,
  try_on_month_reset DATE NOT NULL DEFAULT date_trunc('month', now())::date,
  last_photo_url TEXT,
  quiz_completed_at TIMESTAMPTZ,
  notify_email BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.consumer_profiles ENABLE ROW LEVEL SECURITY;

-- ----- RETAILERS -----
CREATE TABLE public.retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  website TEXT,
  country TEXT,
  currency TEXT NOT NULL DEFAULT 'GBP',
  brand_primary TEXT DEFAULT '#3D1C02',
  widget_cta_text TEXT DEFAULT 'Try it on with Wigsmi',
  contact_name TEXT,
  referral_source TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  plan TEXT NOT NULL DEFAULT 'starter',
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '90 days'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.retailers ENABLE ROW LEVEL SECURITY;
CREATE INDEX retailers_owner_idx ON public.retailers(owner_id);

-- ----- WIGS -----
CREATE TABLE public.wigs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID NOT NULL REFERENCES public.retailers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  style_type TEXT NOT NULL,
  hair_texture TEXT NOT NULL,
  hair_length TEXT,
  hair_origin TEXT,
  colors TEXT[] NOT NULL DEFAULT '{}',
  images TEXT[] NOT NULL DEFAULT '{}',
  ar_asset_url TEXT,
  product_url TEXT,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  featured_rank INTEGER,
  try_on_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wigs ENABLE ROW LEVEL SECURITY;
CREATE INDEX wigs_retailer_idx ON public.wigs(retailer_id);
CREATE INDEX wigs_published_idx ON public.wigs(is_published) WHERE is_published;
CREATE INDEX wigs_featured_idx ON public.wigs(is_featured, featured_rank) WHERE is_featured;
CREATE INDEX wigs_style_idx ON public.wigs(style_type);
CREATE INDEX wigs_texture_idx ON public.wigs(hair_texture);

-- ----- WISHLIST -----
CREATE TABLE public.wishlist_items (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wig_id UUID NOT NULL REFERENCES public.wigs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, wig_id)
);
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- ----- TRY-ON EVENTS -----
CREATE TABLE public.try_on_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  wig_id UUID NOT NULL REFERENCES public.wigs(id) ON DELETE CASCADE,
  retailer_id UUID REFERENCES public.retailers(id) ON DELETE SET NULL,
  anonymous_session TEXT,
  country TEXT,
  device TEXT,
  source TEXT, -- 'app' | 'widget' | 'public'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.try_on_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX try_on_wig_idx ON public.try_on_events(wig_id);
CREATE INDEX try_on_retailer_idx ON public.try_on_events(retailer_id, created_at DESC);
CREATE INDEX try_on_user_idx ON public.try_on_events(user_id, created_at DESC);

-- ----- WIG CLICKS -----
CREATE TABLE public.wig_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  wig_id UUID NOT NULL REFERENCES public.wigs(id) ON DELETE CASCADE,
  retailer_id UUID REFERENCES public.retailers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wig_clicks ENABLE ROW LEVEL SECURITY;
CREATE INDEX clicks_retailer_idx ON public.wig_clicks(retailer_id, created_at DESC);

-- ----- SUBSCRIPTIONS -----
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('consumer','retailer')),
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  billing_interval TEXT, -- 'month' | 'year'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX subs_profile_idx ON public.subscriptions(profile_id);

-- ----- WIDGET EMBEDS -----
CREATE TABLE public.widget_embeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID NOT NULL REFERENCES public.retailers(id) ON DELETE CASCADE,
  embed_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  widget_type TEXT NOT NULL DEFAULT 'full', -- 'full' | 'product' | 'button'
  allowed_domains TEXT[] NOT NULL DEFAULT '{}',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.widget_embeds ENABLE ROW LEVEL SECURITY;
CREATE INDEX widget_retailer_idx ON public.widget_embeds(retailer_id);

-- ----- API KEYS -----
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID NOT NULL REFERENCES public.retailers(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  key_hash TEXT NOT NULL,
  last4 TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- ----- ANALYTICS EVENTS -----
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID REFERENCES public.retailers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX analytics_retailer_idx ON public.analytics_events(retailer_id, created_at DESC);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_consumer_profiles BEFORE UPDATE ON public.consumer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_retailers BEFORE UPDATE ON public.retailers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_wigs BEFORE UPDATE ON public.wigs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_subscriptions BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_widget_embeds BEFORE UPDATE ON public.widget_embeds
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile + consumer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  -- Role from signup metadata; default consumer
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'consumer'));

  -- Consumer profile row for everyone (cheap; ignored for retailers)
  INSERT INTO public.consumer_profiles (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles
CREATE POLICY "Profiles: read own" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- user_roles
CREATE POLICY "Roles: read own" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Roles: admin manage" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- consumer_profiles
CREATE POLICY "Consumer: own" ON public.consumer_profiles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Consumer: update own" ON public.consumer_profiles FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Consumer: insert own" ON public.consumer_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- retailers
CREATE POLICY "Retailers: public read basic" ON public.retailers FOR SELECT
  USING (is_active);
CREATE POLICY "Retailers: owner update" ON public.retailers FOR UPDATE
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Retailers: owner insert" ON public.retailers FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Retailers: admin delete" ON public.retailers FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- wigs
CREATE POLICY "Wigs: public read published" ON public.wigs FOR SELECT
  USING (is_published OR EXISTS (SELECT 1 FROM public.retailers r WHERE r.id = wigs.retailer_id AND r.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Wigs: retailer manage" ON public.wigs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.retailers r WHERE r.id = wigs.retailer_id AND r.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.retailers r WHERE r.id = wigs.retailer_id AND r.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- wishlist
CREATE POLICY "Wishlist: own" ON public.wishlist_items FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- try_on_events
CREATE POLICY "Try-on: insert any signed in" ON public.try_on_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Try-on: read own" ON public.try_on_events FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.retailers r WHERE r.id = try_on_events.retailer_id AND r.owner_id = auth.uid())
  );

-- wig_clicks
CREATE POLICY "Clicks: insert any" ON public.wig_clicks FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Clicks: retailer/admin read" ON public.wig_clicks FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.retailers r WHERE r.id = wig_clicks.retailer_id AND r.owner_id = auth.uid())
  );

-- subscriptions
CREATE POLICY "Subs: own" ON public.subscriptions FOR SELECT
  USING (auth.uid() = profile_id OR public.has_role(auth.uid(), 'admin'));

-- widget_embeds
CREATE POLICY "Widgets: retailer own" ON public.widget_embeds FOR ALL
  USING (EXISTS (SELECT 1 FROM public.retailers r WHERE r.id = widget_embeds.retailer_id AND r.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.retailers r WHERE r.id = widget_embeds.retailer_id AND r.owner_id = auth.uid()));

-- api_keys
CREATE POLICY "API keys: retailer own" ON public.api_keys FOR ALL
  USING (EXISTS (SELECT 1 FROM public.retailers r WHERE r.id = api_keys.retailer_id AND r.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.retailers r WHERE r.id = api_keys.retailer_id AND r.owner_id = auth.uid()));

-- analytics_events
CREATE POLICY "Analytics: retailer/admin read" ON public.analytics_events FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.retailers r WHERE r.id = analytics_events.retailer_id AND r.owner_id = auth.uid())
  );
CREATE POLICY "Analytics: insert" ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('wig-images', 'wig-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('user-photos', 'user-photos', false)
ON CONFLICT (id) DO NOTHING;

-- wig-images: public read; retailers/admins write
CREATE POLICY "Wig images public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'wig-images');
CREATE POLICY "Wig images retailer write" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'wig-images'
    AND (public.has_role(auth.uid(), 'retailer') OR public.has_role(auth.uid(), 'admin'))
  );
CREATE POLICY "Wig images retailer update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'wig-images'
    AND (public.has_role(auth.uid(), 'retailer') OR public.has_role(auth.uid(), 'admin'))
  );
CREATE POLICY "Wig images retailer delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'wig-images'
    AND (public.has_role(auth.uid(), 'retailer') OR public.has_role(auth.uid(), 'admin'))
  );

-- user-photos: user-scoped, folder = auth.uid()
CREATE POLICY "User photos read own" ON storage.objects FOR SELECT
  USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "User photos write own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "User photos update own" ON storage.objects FOR UPDATE
  USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "User photos delete own" ON storage.objects FOR DELETE
  USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
