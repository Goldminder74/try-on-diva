CREATE TABLE public.retailer_billing_details (retailer_id uuid PRIMARY KEY REFERENCES public.retailers(id) ON DELETE CASCADE, vat_number text);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retailer_billing_details TO authenticated;
GRANT ALL ON public.retailer_billing_details TO service_role;
ALTER TABLE public.retailer_billing_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner billing details" ON public.retailer_billing_details FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.retailers r WHERE r.id = retailer_id AND r.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.retailers r WHERE r.id = retailer_id AND r.owner_id = auth.uid()));
COMMENT ON COLUMN public.retailers.vat_number IS 'DEPRECATED: use private retailer_billing_details.vat_number; never populated by the app.';