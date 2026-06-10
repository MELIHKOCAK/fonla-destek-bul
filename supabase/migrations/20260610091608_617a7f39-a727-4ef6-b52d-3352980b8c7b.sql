
INSERT INTO public.release_gates (key, enabled, description) VALUES
  ('kill_switch_new_contributions', true, 'Yeni katkı (contribution) kabul anahtarı. Kapatıldığında Checkout başlatılmaz.'),
  ('kill_switch_new_creator_transfers', true, 'Yeni creator Transfer komutu kabul anahtarı. Kapatıldığında transfer queue durdurulur.'),
  ('production_refund_command_enabled', false, 'Live Stripe Refund komutu aktivasyonu (manuel ops onayı ile).'),
  ('production_transfer_reversal_enabled', false, 'Live creator Transfer Reversal komutu aktivasyonu.')
ON CONFLICT (key) DO NOTHING;
