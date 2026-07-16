-- AQTA v1.0 Schema Migration

-- AQTA Levels (Floors)
CREATE TABLE public.aqta_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    file_id UUID REFERENCES public.project_files(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., 'Ground Floor', 'Basement'
    elevation NUMERIC, -- Height from base
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- AQTA Grids
CREATE TABLE public.aqta_grids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    file_id UUID REFERENCES public.project_files(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    label TEXT NOT NULL, -- 'A', '1'
    orientation TEXT CHECK (orientation IN ('horizontal', 'vertical', 'radial')),
    coordinates JSONB, -- Line start/end
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- AQTA Elements (Master table for all Structural and Architectural elements)
CREATE TABLE public.aqta_elements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    file_id UUID REFERENCES public.project_files(id) ON DELETE CASCADE,
    level_id UUID REFERENCES public.aqta_levels(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    discipline TEXT NOT NULL CHECK (discipline IN ('structural', 'architectural', 'mep')),
    element_type TEXT NOT NULL, -- 'wall', 'column', 'beam', 'slab', 'door', 'window', 'footing'
    geometry_type TEXT NOT NULL CHECK (geometry_type IN ('polygon', 'polyline', 'point', 'rectangle', 'arc')),
    geometry_data JSONB NOT NULL, -- The actual coordinates/dimensions extracted
    properties JSONB, -- Length, Area, Volume calculated by deterministic engine
    is_validated BOOLEAN DEFAULT false, -- True if human reviewed
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'calculated', 'error')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- AQTA Rooms (Enclosed spaces generated via Graph Traversal)
CREATE TABLE public.aqta_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    file_id UUID REFERENCES public.project_files(id) ON DELETE CASCADE,
    level_id UUID REFERENCES public.aqta_levels(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- 'Master Bedroom', 'Living Room'
    polygon_data JSONB NOT NULL,
    area NUMERIC,
    perimeter NUMERIC,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- AQTA Graph Relationships (e.g. Door belongs to Wall, Column sits on Footing)
CREATE TABLE public.aqta_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    parent_element_id UUID REFERENCES public.aqta_elements(id) ON DELETE CASCADE,
    child_element_id UUID REFERENCES public.aqta_elements(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL, -- 'hosted_by', 'supported_by', 'intersects'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.aqta_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aqta_grids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aqta_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aqta_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aqta_relationships ENABLE ROW LEVEL SECURITY;

-- Apply Strict RLS for all AQTA tables
DO $$ 
DECLARE
    table_name text;
BEGIN
    FOR table_name IN SELECT unnest(ARRAY['aqta_levels', 'aqta_grids', 'aqta_elements', 'aqta_rooms', 'aqta_relationships'])
    LOOP
        EXECUTE format('
            CREATE POLICY "%I Strict Select" ON public.%I FOR SELECT 
            USING (company_id = public.get_user_company() OR public.get_user_role() = ''super_admin'');
            
            CREATE POLICY "%I Strict Insert" ON public.%I FOR INSERT 
            WITH CHECK (company_id = public.get_user_company() OR public.get_user_role() = ''super_admin'');
            
            CREATE POLICY "%I Strict Update" ON public.%I FOR UPDATE 
            USING (company_id = public.get_user_company() OR public.get_user_role() = ''super_admin'');
            
            CREATE POLICY "%I Strict Delete" ON public.%I FOR DELETE 
            USING (company_id = public.get_user_company() OR public.get_user_role() = ''super_admin'');
        ', table_name, table_name, table_name, table_name, table_name, table_name, table_name, table_name);
    END LOOP;
END $$;
