-- Phase 4E.1: escrow on order payment + withdrawal review workflow

CREATE OR REPLACE FUNCTION public.process_order_escrow_payment(
  p_order_id UUID,
  p_seller_id UUID,
  p_buyer_id UUID,
  p_total NUMERIC,
  p_description TEXT DEFAULT 'Order escrow payment'
)
RETURNS JSONB AS $$
BEGIN
  IF p_total IS NULL OR p_total <= 0 THEN
    RAISE EXCEPTION 'Invalid order total';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE order_id = p_order_id AND type = 'order_escrow'
  ) THEN
    RETURN jsonb_build_object('duplicate', true, 'total', p_total);
  END IF;

  INSERT INTO public.user_wallets (account_id)
  VALUES (p_seller_id)
  ON CONFLICT (account_id) DO NOTHING;

  UPDATE public.user_wallets
  SET pending_balance = pending_balance + p_total,
      updated_at = NOW()
  WHERE account_id = p_seller_id;

  INSERT INTO public.wallet_transactions (
    account_id, type, ledger, amount, order_id, description, metadata
  )
  VALUES (
    p_seller_id,
    'order_escrow',
    'pending',
    p_total,
    p_order_id,
    p_description,
    jsonb_build_object('buyer_id', p_buyer_id)
  );

  INSERT INTO public.payment_records (account_id, amount, order_id, status)
  VALUES (p_buyer_id, p_total, p_order_id, 'completed');

  RETURN jsonb_build_object('duplicate', false, 'total', p_total);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.review_withdrawal_request(
  p_withdrawal_id UUID,
  p_status withdrawal_status,
  p_reviewed_by UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_row public.withdrawal_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.withdrawal_requests
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  IF p_status = 'approved' THEN
    IF v_row.status <> 'pending_review' THEN
      RAISE EXCEPTION 'Withdrawal must be pending review to approve';
    END IF;
  ELSIF p_status = 'rejected' THEN
    IF v_row.status <> 'pending_review' THEN
      RAISE EXCEPTION 'Withdrawal must be pending review to reject';
    END IF;

    UPDATE public.user_wallets
    SET available_balance = available_balance + v_row.amount,
        updated_at = NOW()
    WHERE account_id = v_row.account_id;

    INSERT INTO public.wallet_transactions (
      account_id, type, ledger, amount, description, metadata
    )
    VALUES (
      v_row.account_id,
      'refund',
      'available',
      v_row.amount,
      'Withdrawal rejected — funds returned',
      jsonb_build_object('withdrawal_id', p_withdrawal_id)
    );
  ELSIF p_status = 'completed' THEN
    IF v_row.status <> 'approved' THEN
      RAISE EXCEPTION 'Withdrawal must be approved before completion';
    END IF;

    UPDATE public.user_wallets
    SET withdrawn_total = withdrawn_total + v_row.amount,
        updated_at = NOW()
    WHERE account_id = v_row.account_id;

    INSERT INTO public.wallet_transactions (
      account_id, type, ledger, amount, description, metadata
    )
    VALUES (
      v_row.account_id,
      'withdrawal_completed',
      'withdrawn',
      v_row.amount,
      'Withdrawal transfer completed',
      jsonb_build_object('withdrawal_id', p_withdrawal_id)
    );
  ELSE
    RAISE EXCEPTION 'Unsupported withdrawal status';
  END IF;

  UPDATE public.withdrawal_requests
  SET status = p_status,
      reviewed_by = p_reviewed_by,
      admin_notes = COALESCE(p_admin_notes, admin_notes),
      completed_at = CASE WHEN p_status = 'completed' THEN NOW() ELSE completed_at END
  WHERE id = p_withdrawal_id;

  RETURN jsonb_build_object(
    'id', p_withdrawal_id,
    'status', p_status,
    'amount', v_row.amount
  );
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_wallet_tx_order_escrow
  ON public.wallet_transactions(order_id, type)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_records_order
  ON public.payment_records(order_id, status);
