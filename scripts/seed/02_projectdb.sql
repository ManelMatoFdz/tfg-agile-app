-- ============================================================================
--  Nexora Consulting — Seed 02: projectdb (project-service)
--  Workspaces, categorias, equipos, miembros, invitaciones y proyectos.
-- ============================================================================

BEGIN;

TRUNCATE TABLE workspace_invitations, workspace_members, team_members,
               projects, categories, teams, workspaces CASCADE;

-- ---------------------------------------------------------------------------
-- 1. Workspaces
-- ---------------------------------------------------------------------------
INSERT INTO workspaces (id, name, description, owner_id, created_at, updated_at) VALUES
                                                                                     ('22222222-0000-0000-0000-000000000001','Nexora Consulting','Consultora tecnologica y de transformacion digital. Equipos Scrum multidisciplinares orientados a resultados de cliente.','a21a40cb-6b69-42a0-b790-b576df0641ec',now() - interval '180 days',now() - interval '5 days'),
                                                                                     ('22222222-0000-0000-0000-000000000002','Nexora Growth Lab','Unidad de consultoria para iniciativas de crecimiento, canales digitales y validacion rapida con clientes.','11111111-0000-0000-0000-000000000001',now() - interval '95 days',now() - interval '9 days');

-- ---------------------------------------------------------------------------
-- 2. Miembros de workspace
-- ---------------------------------------------------------------------------
INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES
-- Nexora Consulting
('22220000-0001-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','a21a40cb-6b69-42a0-b790-b576df0641ec','ADMIN', now() - interval '180 days'),
('22220000-0001-0000-0000-000000000002','22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','ADMIN', now() - interval '178 days'),
('22220000-0001-0000-0000-000000000003','22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','MEMBER',now() - interval '175 days'),
('22220000-0001-0000-0000-000000000004','22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000003','MEMBER',now() - interval '170 days'),
('22220000-0001-0000-0000-000000000005','22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000004','MEMBER',now() - interval '165 days'),
('22220000-0001-0000-0000-000000000006','22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000005','ADMIN', now() - interval '160 days'),
('22220000-0001-0000-0000-000000000007','22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000006','MEMBER',now() - interval '150 days'),
('22220000-0001-0000-0000-000000000008','22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000007','MEMBER',now() - interval '140 days'),
('22220000-0001-0000-0000-000000000009','22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000008','MEMBER',now() - interval '135 days'),
('22220000-0001-0000-0000-00000000000a','22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000009','MEMBER',now() - interval '130 days'),
('22220000-0001-0000-0000-00000000000b','22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000010','MEMBER',now() - interval '120 days'),
-- Nexora Growth Lab
('22220000-0002-0000-0000-000000000001','22222222-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001','ADMIN', now() - interval '95 days'),
('22220000-0002-0000-0000-000000000002','22222222-0000-0000-0000-000000000002','a21a40cb-6b69-42a0-b790-b576df0641ec','ADMIN', now() - interval '60 days'),
('22220000-0002-0000-0000-000000000003','22222222-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000011','MEMBER',now() - interval '90 days'),
('22220000-0002-0000-0000-000000000004','22222222-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000012','MEMBER',now() - interval '88 days'),
('22220000-0002-0000-0000-000000000005','22222222-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000009','MEMBER',now() - interval '40 days');

-- ---------------------------------------------------------------------------
-- 3. Invitaciones de workspace
-- ---------------------------------------------------------------------------
INSERT INTO workspace_invitations (id, workspace_id, invited_email, invited_user_id, invited_by_user_id, status, created_at, updated_at) VALUES
                                                                                                                                             ('22221111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000002','sergio.rey@nexora-consulting.dev',   '11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001','PENDING', now() - interval '20 days', now() - interval '20 days'),
                                                                                                                                             ('22221111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000002','marta.castro@nexora-consulting.dev',  '11111111-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000001','PENDING', now() - interval '15 days', now() - interval '15 days'),
                                                                                                                                             ('22221111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000002','carla.mendez@nexora-consulting.dev', '11111111-0000-0000-0000-000000000009','11111111-0000-0000-0000-000000000001','ACCEPTED',now() - interval '42 days', now() - interval '40 days'),
                                                                                                                                             ('22221111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000001','elena.rios@nexora-consulting.dev',   '11111111-0000-0000-0000-000000000011','a21a40cb-6b69-42a0-b790-b576df0641ec','PENDING', now() - interval '8 days',  now() - interval '8 days'),
                                                                                                                                             ('22221111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000001','tomas.neira@nexora-consulting.dev',  '11111111-0000-0000-0000-000000000012','a21a40cb-6b69-42a0-b790-b576df0641ec','REJECTED',now() - interval '30 days', now() - interval '28 days'),
                                                                                                                                             ('22221111-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000002','nerea.castro@nexora-consulting.dev', '11111111-0000-0000-0000-000000000007','11111111-0000-0000-0000-000000000001','PENDING', now() - interval '20 days', now() - interval '20 days');

-- ---------------------------------------------------------------------------
-- 4. Categorias
-- ---------------------------------------------------------------------------
INSERT INTO categories (id, workspace_id, name, color, "position", created_at) VALUES
                                                                                   ('44444444-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','Experiencia de cliente','#6366F1',0,now() - interval '178 days'),
                                                                                   ('44444444-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000001','Transformacion operativa','#0EA5E9',1,now() - interval '178 days'),
                                                                                   ('44444444-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000001','Mejora interna','#10B981',2,now() - interval '170 days'),
                                                                                   ('44444444-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000002','Growth y canales','#F59E0B',0,now() - interval '94 days');

-- ---------------------------------------------------------------------------
-- 5. Equipos
-- ---------------------------------------------------------------------------
INSERT INTO teams (id, workspace_id, name, description, color, created_at, updated_at) VALUES
                                                                                           ('33333333-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','Equipo Atlas','Equipo Scrum multidisciplinar: producto, ingenieria, datos, calidad y operaciones.','#0EA5E9',now() - interval '177 days',now() - interval '10 days'),
                                                                                           ('33333333-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000001','Equipo Boreal','Equipo Scrum multidisciplinar orientado a experiencia de cliente, integraciones y producto digital.','#8B5CF6',now() - interval '176 days',now() - interval '3 days'),
                                                                                           ('33333333-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000001','Equipo Cobalto','Equipo Scrum de mejora continua con perfiles de calidad, automatizacion, facilitacion y cambio.','#10B981',now() - interval '150 days',now() - interval '20 days'),
                                                                                           ('33333333-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000002','Equipo Delta','Equipo Scrum compacto para iniciativas de crecimiento, experiencia digital, datos y tecnologia.','#F59E0B',now() - interval '94 days',now() - interval '9 days');

-- ---------------------------------------------------------------------------
-- 6. Miembros de equipo (rol tecnico + rol Scrum)
-- ---------------------------------------------------------------------------
INSERT INTO team_members (id, team_id, user_id, role, scrum_role, joined_at, last_active_at) VALUES
-- Equipo Atlas
('33330000-0001-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','a21a40cb-6b69-42a0-b790-b576df0641ec','ADMIN', 'PRODUCT_OWNER',now() - interval '177 days',now() - interval '1 days'),
('33330000-0001-0000-0000-000000000002','33333333-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','MEMBER','SCRUM_MASTER', now() - interval '175 days',now() - interval '2 days'),
('33330000-0001-0000-0000-000000000003','33333333-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000004','MEMBER','DEVELOPER',    now() - interval '165 days',now() - interval '1 days'),
('33330000-0001-0000-0000-000000000004','33333333-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000008','MEMBER','DEVELOPER',    now() - interval '135 days',now() - interval '4 days'),
('33330000-0001-0000-0000-000000000005','33333333-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000010','MEMBER','DEVELOPER',    now() - interval '120 days',now() - interval '12 days'),
-- Equipo Boreal
('33330000-0002-0000-0000-000000000001','33333333-0000-0000-0000-000000000002','a21a40cb-6b69-42a0-b790-b576df0641ec','ADMIN', 'PRODUCT_OWNER',now() - interval '176 days',now() - interval '1 days'),
('33330000-0002-0000-0000-000000000002','33333333-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001','ADMIN', 'SCRUM_MASTER', now() - interval '176 days',now() - interval '3 days'),
('33330000-0002-0000-0000-000000000003','33333333-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000003','MEMBER','DEVELOPER',    now() - interval '170 days',now() - interval '1 days'),
('33330000-0002-0000-0000-000000000004','33333333-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000005','MEMBER','DEVELOPER',    now() - interval '160 days',now() - interval '4 days'),
('33330000-0002-0000-0000-000000000005','33333333-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000006','MEMBER','DEVELOPER',    now() - interval '150 days',now() - interval '6 days'),
('33330000-0002-0000-0000-000000000006','33333333-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000009','MEMBER','DEVELOPER',    now() - interval '130 days',now() - interval '1 days'),
-- Equipo Cobalto
('33330000-0003-0000-0000-000000000001','33333333-0000-0000-0000-000000000003','a21a40cb-6b69-42a0-b790-b576df0641ec','ADMIN', 'SCRUM_MASTER', now() - interval '150 days',now() - interval '1 days'),
('33330000-0003-0000-0000-000000000002','33333333-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000005','MEMBER','PRODUCT_OWNER',now() - interval '150 days',now() - interval '4 days'),
('33330000-0003-0000-0000-000000000003','33333333-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000007','MEMBER','DEVELOPER',    now() - interval '140 days',now() - interval '8 days'),
('33330000-0003-0000-0000-000000000004','33333333-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000008','MEMBER','DEVELOPER',    now() - interval '135 days',now() - interval '4 days'),
-- Equipo Delta
('33330000-0004-0000-0000-000000000001','33333333-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000001','ADMIN', 'PRODUCT_OWNER',now() - interval '94 days',now() - interval '3 days'),
('33330000-0004-0000-0000-000000000002','33333333-0000-0000-0000-000000000004','a21a40cb-6b69-42a0-b790-b576df0641ec','ADMIN', 'SCRUM_MASTER', now() - interval '60 days',now() - interval '1 days'),
('33330000-0004-0000-0000-000000000003','33333333-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000011','MEMBER','DEVELOPER',    now() - interval '90 days',now() - interval '7 days'),
('33330000-0004-0000-0000-000000000004','33333333-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000012','MEMBER','DEVELOPER',    now() - interval '88 days',now() - interval '14 days'),
('33330000-0004-0000-0000-000000000005','33333333-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000009','MEMBER','DEVELOPER',    now() - interval '40 days',now() - interval '1 days');

-- ---------------------------------------------------------------------------
-- 7. Proyectos
-- ---------------------------------------------------------------------------
INSERT INTO projects (id, workspace_id, category_id, team_id, name, description, visibility, color, created_at, updated_at) VALUES
                                                                                                                                ('55555555-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000002','Orion Seguros · Gestion de Siniestros','Transformacion end-to-end del proceso de apertura, tramitacion, peritacion y seguimiento de siniestros.','WORKSPACE','#6366F1',now() - interval '170 days',now() - interval '1 days'),
                                                                                                                                ('55555555-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000001','Vega Retail · Operacion Omnicanal','Unificacion de pedidos, stock, partners y trazabilidad operativa entre los distintos canales de venta.','WORKSPACE','#0EA5E9',now() - interval '168 days',now() - interval '2 days'),
                                                                                                                                ('55555555-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000002','Atlas Energia · Area de Cliente','Area digital para consultar contratos, abrir solicitudes, adjuntar documentacion y seguir gestiones.','PRIVATE','#8B5CF6',now() - interval '90 days',now() - interval '3 days'),
                                                                                                                                ('55555555-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000001','NovaLog · Torre de Control Operativa','Visibilidad centralizada de expediciones, ETA, incidencias, riesgos y niveles de servicio logisticos.','PRIVATE','#F97316',now() - interval '85 days',now() - interval '6 days'),
                                                                                                                                ('55555555-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000003','Nexora · Excelencia Operativa','Estandarizacion de onboarding, conocimiento y mejora continua de los equipos Scrum de la consultora.','WORKSPACE','#10B981',now() - interval '70 days',now() - interval '18 days'),
                                                                                                                                ('55555555-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000002','44444444-0000-0000-0000-000000000004','33333333-0000-0000-0000-000000000004','Marea Foods · Canal D2C','Lanzamiento del canal directo al consumidor con captacion, contenidos, CRM, medicion y privacidad.','WORKSPACE','#F59E0B',now() - interval '92 days',now() - interval '2 days');

COMMIT;
