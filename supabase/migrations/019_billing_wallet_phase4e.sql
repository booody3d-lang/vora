-- Phase 4E: wallet bootstrap + admin withdrawal visibility + indexes

CREATE OR REPLACE FUNCTION public.ensure_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_wallets (account_id)
  VALUES (NEW.id)
  ON CONFLICT (account_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_accounts_user_wallet ON public.accounts;
CREATE TRIGGER trg_accounts_user_wallet
  AFTER INSERT ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.ensure_user_wallet();

CREATE POLICY "withdrawals_admin_select" ON public.withdrawal_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = auth.uid() AND a.primary_role IN ('admin', 'owner')
    )
  );

CREATE POLICY "withdrawals_admin_update" ON public.withdrawal_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = auth.uid() AND a.primary_role IN ('admin', 'owner')
    )
  );

CREATE INDEX IF NOT EXISTS idx_invoices_account ON public.invoices(account_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_account ON public.wallet_transactions(account_id, created_at DESC);
