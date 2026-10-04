-- ==============================================================================
-- COMMUNITY ANIMATION HUB: Supabase Row Level Security (RLS) & Realtime Config
-- Version: 1.0 (Phase 1 Foundation)
-- ==============================================================================

-- 1. Enable Row Level Security (RLS) across all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.render_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to allow clean re-application
DROP POLICY IF EXISTS "Public can view projects" ON public.projects;
DROP POLICY IF EXISTS "Public can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Public can update projects" ON public.projects;

DROP POLICY IF EXISTS "Public can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Public can insert project members" ON public.project_members;
DROP POLICY IF EXISTS "Public can update project members" ON public.project_members;

DROP POLICY IF EXISTS "Public can view scenes" ON public.scenes;
DROP POLICY IF EXISTS "Public can insert scenes" ON public.scenes;
DROP POLICY IF EXISTS "Public can update scenes" ON public.scenes;

DROP POLICY IF EXISTS "Public can view idea votes" ON public.idea_votes;
DROP POLICY IF EXISTS "Public can insert idea votes" ON public.idea_votes;
DROP POLICY IF EXISTS "Public can delete idea votes" ON public.idea_votes;

DROP POLICY IF EXISTS "Public can view handoffs" ON public.handoffs;
DROP POLICY IF EXISTS "Public can insert handoffs" ON public.handoffs;
DROP POLICY IF EXISTS "Public can update handoffs" ON public.handoffs;

DROP POLICY IF EXISTS "Public can view render requests" ON public.render_requests;
DROP POLICY IF EXISTS "Public can insert render requests" ON public.render_requests;
DROP POLICY IF EXISTS "Public can update render requests" ON public.render_requests;

DROP POLICY IF EXISTS "Public can view feedback" ON public.feedback;
DROP POLICY IF EXISTS "Public can insert feedback" ON public.feedback;
DROP POLICY IF EXISTS "Public can update feedback" ON public.feedback;

-- 3. Projects Table Policies (Lightweight Community MVP)
CREATE POLICY "Public can view projects" 
ON public.projects FOR SELECT USING (true);

CREATE POLICY "Public can insert projects" 
ON public.projects FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update projects" 
ON public.projects FOR UPDATE USING (true) WITH CHECK (true);

-- 4. Project Members Policies
CREATE POLICY "Public can view project members" 
ON public.project_members FOR SELECT USING (true);

CREATE POLICY "Public can insert project members" 
ON public.project_members FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update project members" 
ON public.project_members FOR UPDATE USING (true) WITH CHECK (true);

-- 5. Scenes Table Policies
CREATE POLICY "Public can view scenes" 
ON public.scenes FOR SELECT USING (true);

CREATE POLICY "Public can insert scenes" 
ON public.scenes FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update scenes" 
ON public.scenes FOR UPDATE USING (true) WITH CHECK (true);

-- 6. Idea Votes Policies (Unique per voter_id & idea_id)
CREATE POLICY "Public can view idea votes" 
ON public.idea_votes FOR SELECT USING (true);

CREATE POLICY "Public can insert idea votes" 
ON public.idea_votes FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can delete idea votes" 
ON public.idea_votes FOR DELETE USING (true);

-- 7. Handoffs Policies
CREATE POLICY "Public can view handoffs" 
ON public.handoffs FOR SELECT USING (true);

CREATE POLICY "Public can insert handoffs" 
ON public.handoffs FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update handoffs" 
ON public.handoffs FOR UPDATE USING (true) WITH CHECK (true);

-- 8. Render Requests Policies (Atomic claim & update)
CREATE POLICY "Public can view render requests" 
ON public.render_requests FOR SELECT USING (true);

CREATE POLICY "Public can insert render requests" 
ON public.render_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update render requests" 
ON public.render_requests FOR UPDATE USING (true) WITH CHECK (true);

-- 9. Feedback Policies
CREATE POLICY "Public can view feedback" 
ON public.feedback FOR SELECT USING (true);

CREATE POLICY "Public can insert feedback" 
ON public.feedback FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update feedback" 
ON public.feedback FOR UPDATE USING (true) WITH CHECK (true);

-- 10. Enable Supabase Realtime for interactive collaboration tables
-- If running for the first time, ensure publication exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scenes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.render_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE public.idea_votes;
