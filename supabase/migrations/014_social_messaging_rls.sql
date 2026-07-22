-- Additional RLS for conversations/messages (002 created tables; admin client bypasses RLS)

CREATE POLICY "conversations_insert_participant" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);

CREATE POLICY "conversations_update_participant" ON public.conversations
  FOR UPDATE USING (auth.uid() = participant_a OR auth.uid() = participant_b);

-- Company follows stored in JSON until company ecosystem migrates; user connections use connections table.
