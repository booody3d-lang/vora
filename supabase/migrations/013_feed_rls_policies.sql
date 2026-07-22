-- RLS policies for feed engagement tables (002 created tables + network_posts policies only)

-- Reactions: public read counts; users manage own reaction
CREATE POLICY "post_reactions_select" ON public.post_reactions
  FOR SELECT USING (TRUE);
CREATE POLICY "post_reactions_insert_own" ON public.post_reactions
  FOR INSERT WITH CHECK (auth.uid() = account_id);
CREATE POLICY "post_reactions_update_own" ON public.post_reactions
  FOR UPDATE USING (auth.uid() = account_id) WITH CHECK (auth.uid() = account_id);
CREATE POLICY "post_reactions_delete_own" ON public.post_reactions
  FOR DELETE USING (auth.uid() = account_id);

-- Comments: public read; authors write/update/delete own
CREATE POLICY "post_comments_select" ON public.post_comments
  FOR SELECT USING (TRUE);
CREATE POLICY "post_comments_insert_own" ON public.post_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "post_comments_update_own" ON public.post_comments
  FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "post_comments_delete_own" ON public.post_comments
  FOR DELETE USING (auth.uid() = author_id);

-- Saves: users manage own saves
CREATE POLICY "post_saves_select_own" ON public.post_saves
  FOR SELECT USING (auth.uid() = account_id);
CREATE POLICY "post_saves_insert_own" ON public.post_saves
  FOR INSERT WITH CHECK (auth.uid() = account_id);
CREATE POLICY "post_saves_delete_own" ON public.post_saves
  FOR DELETE USING (auth.uid() = account_id);

-- Shares: authenticated users record shares; public read counts
CREATE POLICY "post_shares_select" ON public.post_shares
  FOR SELECT USING (TRUE);
CREATE POLICY "post_shares_insert_own" ON public.post_shares
  FOR INSERT WITH CHECK (auth.uid() = sharer_id);

-- Poll votes: users manage own vote; public read for tallies
CREATE POLICY "poll_votes_select" ON public.poll_votes
  FOR SELECT USING (TRUE);
CREATE POLICY "poll_votes_insert_own" ON public.poll_votes
  FOR INSERT WITH CHECK (auth.uid() = voter_id);
CREATE POLICY "poll_votes_delete_own" ON public.poll_votes
  FOR DELETE USING (auth.uid() = voter_id);
