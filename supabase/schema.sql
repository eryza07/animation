-- ==============================================================================
-- COMMUNITY ANIMATION HUB: Supabase PostgreSQL Database Schema
-- Version: 1.0 (Phase 1 Foundation)
-- Tables: projects, project_members, scenes, idea_votes, handoffs, render_requests, feedback
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Clean existing tables if re-running (safe migrations)
-- DROP TABLE IF EXISTS public.feedback CASCADE;
-- DROP TABLE IF EXISTS public.render_requests CASCADE;
-- DROP TABLE IF EXISTS public.handoffs CASCADE;
-- DROP TABLE IF EXISTS public.idea_votes CASCADE;
-- DROP TABLE IF EXISTS public.scenes CASCADE;
-- DROP TABLE IF EXISTS public.project_members CASCADE;
-- DROP TABLE IF EXISTS public.projects CASCADE;

-- 3. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea', 'storyboard', 'animating', 'render', 'review', 'done')),
    cover_url TEXT DEFAULT '',
    coordinator_name TEXT DEFAULT 'Community',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index on slug & status for fast lookup and Kanban filtering
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects (slug);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects (status);

-- 4. Project Members Table
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    member_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Contributor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members (project_id);

-- 5. Scenes Checklist Table
CREATE TABLE IF NOT EXISTS public.scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    scene_no INTEGER NOT NULL,
    title TEXT NOT NULL,
    assignee TEXT DEFAULT 'Unassigned',
    is_done BOOLEAN DEFAULT FALSE NOT NULL,
    notes TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON public.scenes (project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_scene_no ON public.scenes (project_id, scene_no);

-- 6. Idea Votes Table (Lightweight identity deduplication)
CREATE TABLE IF NOT EXISTS public.idea_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id TEXT NOT NULL,
    voter_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_idea_voter UNIQUE (idea_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_idea_votes_idea_id ON public.idea_votes (idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_votes_voter_id ON public.idea_votes (voter_id);

-- 7. Asset Handoffs Table (Raw GDrive links & asset transfer tracking)
CREATE TABLE IF NOT EXISTS public.handoffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    from_member TEXT NOT NULL,
    to_member TEXT NOT NULL,
    gdrive_url TEXT NOT NULL,
    note TEXT DEFAULT '',
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'received')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_handoffs_project_id ON public.handoffs (project_id);

-- 8. Render Requests Table (Relay Render for low-spec creators)
CREATE TABLE IF NOT EXISTS public.render_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
    scene_title TEXT DEFAULT '',
    specs TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'rendering', 'done')),
    claimed_by TEXT,
    result_url TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_render_requests_project_id ON public.render_requests (project_id);
CREATE INDEX IF NOT EXISTS idx_render_requests_status ON public.render_requests (status);

-- 9. Timestamp Feedback Table (Timecode based revision notes)
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    timestamp_sec INTEGER NOT NULL DEFAULT 0,
    comment TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'Member',
    resolved BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_project_timestamp ON public.feedback (project_id, timestamp_sec);

-- 10. Auto-update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_projects_updated_at ON public.projects;
CREATE TRIGGER tr_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS tr_scenes_updated_at ON public.scenes;
CREATE TRIGGER tr_scenes_updated_at
    BEFORE UPDATE ON public.scenes
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS tr_render_requests_updated_at ON public.render_requests;
CREATE TRIGGER tr_render_requests_updated_at
    BEFORE UPDATE ON public.render_requests
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
