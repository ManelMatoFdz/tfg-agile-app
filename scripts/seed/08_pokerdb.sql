-- ============================================================================
--  Nexora Consulting — Seed 08: pokerdb (poker-service)
--  Sesiones de Planning Poker, participantes, rondas y votos.
-- ============================================================================

BEGIN;

TRUNCATE TABLE poker_votes, poker_rounds, poker_participants, poker_sessions CASCADE;

-- ---------------------------------------------------------------------------
-- 1. Sesiones
-- ---------------------------------------------------------------------------
INSERT INTO poker_sessions (id, project_id, name, status, deck, created_by, current_task_id, timer_seconds, created_at, updated_at) VALUES
                                                                                                                                        ('cccccccc-0001-0000-0000-000000000001','55555555-0000-0000-0000-000000000001','Refinamiento valoracion colaborativa','CLOSED','FIBONACCI','a21a40cb-6b69-42a0-b790-b576df0641ec',NULL,60,now() - interval '13 days',now() - interval '13 days'),
                                                                                                                                        ('cccccccc-0001-0000-0000-000000000002','55555555-0000-0000-0000-000000000001','Estimacion red de proveedores','VOTING','FIBONACCI','11111111-0000-0000-0000-000000000005','88888888-0001-0000-0000-000000000021',90,now() - interval '6 days',now() - interval '1 days'),
                                                                                                                                        ('cccccccc-0001-0000-0000-000000000003','55555555-0000-0000-0000-000000000001','Repaso de mejoras de tramitacion','LOBBY','T_SHIRT','a21a40cb-6b69-42a0-b790-b576df0641ec',NULL,NULL,now() - interval '1 days',now() - interval '1 days'),
                                                                                                                                        ('cccccccc-0002-0000-0000-000000000001','55555555-0000-0000-0000-000000000002','Estimacion pedidos y stock','CLOSED','POWERS_OF_2','11111111-0000-0000-0000-000000000002',NULL,60,now() - interval '30 days',now() - interval '29 days'),
                                                                                                                                        ('cccccccc-0002-0000-0000-000000000002','55555555-0000-0000-0000-000000000002','Estimacion trazabilidad operativa','REVEALED','FIBONACCI','11111111-0000-0000-0000-000000000002','88888888-0002-0000-0000-000000000009',60,now() - interval '9 days',now() - interval '2 days'),
                                                                                                                                        ('cccccccc-0003-0000-0000-000000000001','55555555-0000-0000-0000-000000000003','Estimacion area de cliente','LOBBY','T_SHIRT','11111111-0000-0000-0000-000000000001',NULL,NULL,now() - interval '2 days',now() - interval '2 days'),
                                                                                                                                        ('cccccccc-0006-0000-0000-000000000001','55555555-0000-0000-0000-000000000006','Canal D2C: estimacion inicial','CLOSED','T_SHIRT','11111111-0000-0000-0000-000000000001',NULL,NULL,now() - interval '12 days',now() - interval '12 days');

-- ---------------------------------------------------------------------------
-- 2. Participantes
-- ---------------------------------------------------------------------------
INSERT INTO poker_participants (id, session_id, user_id, display_name, role, connected, joined_at) VALUES
-- Refinamiento valoracion colaborativa (cerrada)
('cccc0000-0001-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','a21a40cb-6b69-42a0-b790-b576df0641ec','Manel Mato','MODERATOR',false,now() - interval '13 days'),
('cccc0000-0001-0000-0000-000000000002','cccccccc-0001-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','Sergio Rey','VOTER',   false,now() - interval '13 days'),
('cccc0000-0001-0000-0000-000000000003','cccccccc-0001-0000-0000-000000000001','11111111-0000-0000-0000-000000000003','Marta Castro','VOTER',  false,now() - interval '13 days'),
('cccc0000-0001-0000-0000-000000000004','cccccccc-0001-0000-0000-000000000001','11111111-0000-0000-0000-000000000004','Diego Blanco','VOTER', false,now() - interval '13 days'),
('cccc0000-0001-0000-0000-000000000005','cccccccc-0001-0000-0000-000000000001','11111111-0000-0000-0000-000000000009','Carla Mendez','VOTER', false,now() - interval '13 days'),
('cccc0000-0001-0000-0000-000000000006','cccccccc-0001-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','Laura Vidal','OBSERVER',false,now() - interval '13 days'),
-- Estimacion red de proveedores (en votacion)
('cccc0000-0002-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000002','11111111-0000-0000-0000-000000000005','Ana Figueroa','MODERATOR',true, now() - interval '6 days'),
('cccc0000-0002-0000-0000-000000000002','cccccccc-0001-0000-0000-000000000002','a21a40cb-6b69-42a0-b790-b576df0641ec','Manel Mato','VOTER',  true, now() - interval '6 days'),
('cccc0000-0002-0000-0000-000000000003','cccccccc-0001-0000-0000-000000000002','11111111-0000-0000-0000-000000000002','Sergio Rey','VOTER',   true, now() - interval '6 days'),
('cccc0000-0002-0000-0000-000000000004','cccccccc-0001-0000-0000-000000000002','11111111-0000-0000-0000-000000000003','Marta Castro','VOTER',  true, now() - interval '6 days'),
('cccc0000-0002-0000-0000-000000000005','cccccccc-0001-0000-0000-000000000002','11111111-0000-0000-0000-000000000004','Diego Blanco','VOTER', false,now() - interval '6 days'),
('cccc0000-0002-0000-0000-000000000006','cccccccc-0001-0000-0000-000000000002','11111111-0000-0000-0000-000000000006','Pablo Souto','VOTER',  true, now() - interval '5 days'),
('cccc0000-0002-0000-0000-000000000007','cccccccc-0001-0000-0000-000000000002','11111111-0000-0000-0000-000000000007','Nerea Castro','OBSERVER',true,now() - interval '5 days'),
-- Repaso de mejoras de tramitacion (lobby)
('cccc0000-0003-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000003','a21a40cb-6b69-42a0-b790-b576df0641ec','Manel Mato','MODERATOR',true,now() - interval '1 days'),
('cccc0000-0003-0000-0000-000000000002','cccccccc-0001-0000-0000-000000000003','11111111-0000-0000-0000-000000000002','Sergio Rey','VOTER',   true,now() - interval '1 days'),
('cccc0000-0003-0000-0000-000000000003','cccccccc-0001-0000-0000-000000000003','11111111-0000-0000-0000-000000000003','Marta Castro','VOTER',  true,now() - interval '1 days'),
-- Estimacion pedidos y stock (cerrada)
('cccc0000-0004-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','Sergio Rey','MODERATOR',false,now() - interval '30 days'),
('cccc0000-0004-0000-0000-000000000002','cccccccc-0002-0000-0000-000000000001','11111111-0000-0000-0000-000000000004','Diego Blanco','VOTER', false,now() - interval '30 days'),
('cccc0000-0004-0000-0000-000000000003','cccccccc-0002-0000-0000-000000000001','11111111-0000-0000-0000-000000000008','Ivan Pereira','VOTER', false,now() - interval '30 days'),
('cccc0000-0004-0000-0000-000000000004','cccccccc-0002-0000-0000-000000000001','11111111-0000-0000-0000-000000000010','Hugo Varela','VOTER',  false,now() - interval '30 days'),
-- Estimacion trazabilidad operativa (revelada)
('cccc0000-0005-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','11111111-0000-0000-0000-000000000002','Sergio Rey','MODERATOR',true,now() - interval '9 days'),
('cccc0000-0005-0000-0000-000000000002','cccccccc-0002-0000-0000-000000000002','11111111-0000-0000-0000-000000000010','Hugo Varela','VOTER',  true,now() - interval '9 days'),
('cccc0000-0005-0000-0000-000000000003','cccccccc-0002-0000-0000-000000000002','11111111-0000-0000-0000-000000000008','Ivan Pereira','VOTER', true,now() - interval '9 days'),
('cccc0000-0005-0000-0000-000000000004','cccccccc-0002-0000-0000-000000000002','11111111-0000-0000-0000-000000000004','Diego Blanco','VOTER', false,now() - interval '9 days'),
-- Estimacion area de cliente (lobby)
('cccc0000-0006-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','Laura Vidal','MODERATOR',true,now() - interval '2 days'),
('cccc0000-0006-0000-0000-000000000002','cccccccc-0003-0000-0000-000000000001','11111111-0000-0000-0000-000000000005','Ana Figueroa','VOTER', true,now() - interval '2 days'),
('cccc0000-0006-0000-0000-000000000003','cccccccc-0003-0000-0000-000000000001','11111111-0000-0000-0000-000000000009','Carla Mendez','VOTER', true,now() - interval '2 days'),
-- Canal D2C: estimacion inicial (cerrada)
('cccc0000-0007-0000-0000-000000000001','cccccccc-0006-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','Laura Vidal','MODERATOR',false,now() - interval '12 days'),
('cccc0000-0007-0000-0000-000000000002','cccccccc-0006-0000-0000-000000000001','11111111-0000-0000-0000-000000000011','Elena Rios','VOTER',   false,now() - interval '12 days'),
('cccc0000-0007-0000-0000-000000000003','cccccccc-0006-0000-0000-000000000001','11111111-0000-0000-0000-000000000012','Tomas Neira','VOTER',  false,now() - interval '12 days');

-- ---------------------------------------------------------------------------
-- 3. Rondas
-- ---------------------------------------------------------------------------
INSERT INTO poker_rounds (id, session_id, task_id, task_title, status, final_estimate, started_at, revealed_at, timer_ends_at) VALUES
-- Refinamiento valoracion colaborativa
('cccc1000-0001-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','88888888-0001-0000-0000-000000000011','Sala de valoracion con peritos conectados','CONSENSUS',8, now() - interval '13 days',now() - interval '13 days',NULL),
('cccc1000-0001-0000-0000-000000000002','cccccccc-0001-0000-0000-000000000001','88888888-0001-0000-0000-000000000012','Valoracion de danos en tiempo real','CONSENSUS',13,now() - interval '13 days',now() - interval '13 days',NULL),
('cccc1000-0001-0000-0000-000000000003','cccccccc-0001-0000-0000-000000000001','88888888-0001-0000-0000-000000000013','Comparativa de valoraciones y dispersion','CONSENSUS',8, now() - interval '13 days',now() - interval '13 days',NULL),
('cccc1000-0001-0000-0000-000000000004','cccccccc-0001-0000-0000-000000000001','88888888-0001-0000-0000-000000000014','Registrar valoracion consensuada en el expediente','CONSENSUS',5,now() - interval '13 days',now() - interval '13 days',NULL),
-- Estimacion red de proveedores: una cerrada y una en curso
('cccc1000-0002-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000002','88888888-0001-0000-0000-000000000023','Pantalla de actividad de talleres y peritos','CONSENSUS',8,now() - interval '6 days',now() - interval '6 days',NULL),
('cccc1000-0002-0000-0000-000000000002','cccccccc-0001-0000-0000-000000000002','88888888-0001-0000-0000-000000000022','Vincular eventos de proveedores al expediente','CONSENSUS',8,now() - interval '5 days',now() - interval '5 days',NULL),
('cccc1000-0002-0000-0000-000000000003','cccccccc-0001-0000-0000-000000000002','88888888-0001-0000-0000-000000000021','Integracion con red de talleres mediante webhooks','VOTING',NULL,now() - interval '1 days',NULL,now() - interval '1 days' + interval '90 seconds'),
-- Estimacion pedidos y stock
('cccc1000-0004-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000001','88888888-0002-0000-0000-000000000002','Alta y consulta unificada de pedidos','CONSENSUS',8,now() - interval '30 days',now() - interval '30 days',NULL),
('cccc1000-0004-0000-0000-000000000002','cccccccc-0002-0000-0000-000000000001','88888888-0002-0000-0000-000000000003','Paginacion de pedidos y catalogo','CONSENSUS',4,now() - interval '30 days',now() - interval '30 days',NULL),
('cccc1000-0004-0000-0000-000000000003','cccccccc-0002-0000-0000-000000000001','88888888-0002-0000-0000-000000000004','Proteccion ante exceso de peticiones de partners','CONSENSUS',4,now() - interval '29 days',now() - interval '29 days',NULL),
-- Estimacion trazabilidad operativa (revelada, pendiente de aceptar)
('cccc1000-0005-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','88888888-0002-0000-0000-000000000008','Metricas de sincronizacion omnicanal','CONSENSUS',5,now() - interval '9 days',now() - interval '9 days',NULL),
('cccc1000-0005-0000-0000-000000000002','cccccccc-0002-0000-0000-000000000002','88888888-0002-0000-0000-000000000009','Trazabilidad de pedido entre sistemas','REVEALED',NULL,now() - interval '2 days',now() - interval '2 days',NULL),
-- Canal D2C
('cccc1000-0007-0000-0000-000000000001','cccccccc-0006-0000-0000-000000000001','88888888-0006-0000-0000-000000000001','Catalogo y propuesta de valor del canal','CONSENSUS',NULL,now() - interval '12 days',now() - interval '12 days',NULL),
('cccc1000-0007-0000-0000-000000000002','cccccccc-0006-0000-0000-000000000001','88888888-0006-0000-0000-000000000004','Centro de contenidos y recetas','CONSENSUS',NULL,now() - interval '12 days',now() - interval '12 days',NULL);

-- ---------------------------------------------------------------------------
-- 4. Votos
-- ---------------------------------------------------------------------------
INSERT INTO poker_votes (id, round_id, user_id, "value", voted_at) VALUES
-- Ronda: Sala de valoracion con peritos (consenso en 8)
('cccc2000-0001-0000-0000-000000000001','cccc1000-0001-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','8', now() - interval '13 days'),
('cccc2000-0001-0000-0000-000000000002','cccc1000-0001-0000-0000-000000000001','11111111-0000-0000-0000-000000000003','8', now() - interval '13 days'),
('cccc2000-0001-0000-0000-000000000003','cccc1000-0001-0000-0000-000000000001','11111111-0000-0000-0000-000000000004','5', now() - interval '13 days'),
('cccc2000-0001-0000-0000-000000000004','cccc1000-0001-0000-0000-000000000001','11111111-0000-0000-0000-000000000009','8', now() - interval '13 days'),
('cccc2000-0001-0000-0000-000000000005','cccc1000-0001-0000-0000-000000000001','a21a40cb-6b69-42a0-b790-b576df0641ec','8', now() - interval '13 days'),
-- Ronda: Valoracion de danos (mucha dispersion, cierra en 13)
('cccc2000-0002-0000-0000-000000000001','cccc1000-0001-0000-0000-000000000002','11111111-0000-0000-0000-000000000002','13',now() - interval '13 days'),
('cccc2000-0002-0000-0000-000000000002','cccc1000-0001-0000-0000-000000000002','11111111-0000-0000-0000-000000000003','8', now() - interval '13 days'),
('cccc2000-0002-0000-0000-000000000003','cccc1000-0001-0000-0000-000000000002','11111111-0000-0000-0000-000000000004','21',now() - interval '13 days'),
('cccc2000-0002-0000-0000-000000000004','cccc1000-0001-0000-0000-000000000002','11111111-0000-0000-0000-000000000009','?', now() - interval '13 days'),
('cccc2000-0002-0000-0000-000000000005','cccc1000-0001-0000-0000-000000000002','a21a40cb-6b69-42a0-b790-b576df0641ec','13',now() - interval '13 days'),
-- Ronda: Comparativa de valoraciones
('cccc2000-0003-0000-0000-000000000001','cccc1000-0001-0000-0000-000000000003','11111111-0000-0000-0000-000000000002','8', now() - interval '13 days'),
('cccc2000-0003-0000-0000-000000000002','cccc1000-0001-0000-0000-000000000003','11111111-0000-0000-0000-000000000003','5', now() - interval '13 days'),
('cccc2000-0003-0000-0000-000000000003','cccc1000-0001-0000-0000-000000000003','11111111-0000-0000-0000-000000000004','8', now() - interval '13 days'),
('cccc2000-0003-0000-0000-000000000004','cccc1000-0001-0000-0000-000000000003','11111111-0000-0000-0000-000000000009','8', now() - interval '13 days'),
('cccc2000-0003-0000-0000-000000000005','cccc1000-0001-0000-0000-000000000003','a21a40cb-6b69-42a0-b790-b576df0641ec','13',now() - interval '13 days'),
-- Ronda: Registrar valoracion consensuada
('cccc2000-0004-0000-0000-000000000001','cccc1000-0001-0000-0000-000000000004','11111111-0000-0000-0000-000000000002','5', now() - interval '13 days'),
('cccc2000-0004-0000-0000-000000000002','cccc1000-0001-0000-0000-000000000004','11111111-0000-0000-0000-000000000003','5', now() - interval '13 days'),
('cccc2000-0004-0000-0000-000000000003','cccc1000-0001-0000-0000-000000000004','11111111-0000-0000-0000-000000000004','5', now() - interval '13 days'),
('cccc2000-0004-0000-0000-000000000004','cccc1000-0001-0000-0000-000000000004','11111111-0000-0000-0000-000000000009','3', now() - interval '13 days'),
('cccc2000-0004-0000-0000-000000000005','cccc1000-0001-0000-0000-000000000004','a21a40cb-6b69-42a0-b790-b576df0641ec','5', now() - interval '13 days'),
-- Ronda: Actividad de talleres y peritos
('cccc2000-0005-0000-0000-000000000001','cccc1000-0002-0000-0000-000000000001','a21a40cb-6b69-42a0-b790-b576df0641ec','8', now() - interval '6 days'),
('cccc2000-0005-0000-0000-000000000002','cccc1000-0002-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','8', now() - interval '6 days'),
('cccc2000-0005-0000-0000-000000000003','cccc1000-0002-0000-0000-000000000001','11111111-0000-0000-0000-000000000003','5', now() - interval '6 days'),
('cccc2000-0005-0000-0000-000000000004','cccc1000-0002-0000-0000-000000000001','11111111-0000-0000-0000-000000000006','8', now() - interval '6 days'),
-- Ronda: Vincular eventos de proveedores
('cccc2000-0006-0000-0000-000000000001','cccc1000-0002-0000-0000-000000000002','a21a40cb-6b69-42a0-b790-b576df0641ec','8', now() - interval '5 days'),
('cccc2000-0006-0000-0000-000000000002','cccc1000-0002-0000-0000-000000000002','11111111-0000-0000-0000-000000000002','13',now() - interval '5 days'),
('cccc2000-0006-0000-0000-000000000003','cccc1000-0002-0000-0000-000000000002','11111111-0000-0000-0000-000000000003','8', now() - interval '5 days'),
('cccc2000-0006-0000-0000-000000000004','cccc1000-0002-0000-0000-000000000002','11111111-0000-0000-0000-000000000006','5', now() - interval '5 days'),
-- Ronda en curso: solo han votado dos personas (los valores no se muestran hasta el reveal)
('cccc2000-0007-0000-0000-000000000001','cccc1000-0002-0000-0000-000000000003','11111111-0000-0000-0000-000000000002','13',now() - interval '1 days'),
('cccc2000-0007-0000-0000-000000000002','cccc1000-0002-0000-0000-000000000003','11111111-0000-0000-0000-000000000003','8', now() - interval '1 days'),
-- Estimacion pedidos y stock
('cccc2000-0008-0000-0000-000000000001','cccc1000-0004-0000-0000-000000000001','11111111-0000-0000-0000-000000000004','8', now() - interval '30 days'),
('cccc2000-0008-0000-0000-000000000002','cccc1000-0004-0000-0000-000000000001','11111111-0000-0000-0000-000000000008','8', now() - interval '30 days'),
('cccc2000-0008-0000-0000-000000000003','cccc1000-0004-0000-0000-000000000001','11111111-0000-0000-0000-000000000010','16',now() - interval '30 days'),
('cccc2000-0009-0000-0000-000000000001','cccc1000-0004-0000-0000-000000000002','11111111-0000-0000-0000-000000000004','4', now() - interval '30 days'),
('cccc2000-0009-0000-0000-000000000002','cccc1000-0004-0000-0000-000000000002','11111111-0000-0000-0000-000000000008','4', now() - interval '30 days'),
('cccc2000-0009-0000-0000-000000000003','cccc1000-0004-0000-0000-000000000002','11111111-0000-0000-0000-000000000010','8', now() - interval '30 days'),
('cccc2000-000a-0000-0000-000000000001','cccc1000-0004-0000-0000-000000000003','11111111-0000-0000-0000-000000000004','4', now() - interval '29 days'),
('cccc2000-000a-0000-0000-000000000002','cccc1000-0004-0000-0000-000000000003','11111111-0000-0000-0000-000000000008','4', now() - interval '29 days'),
('cccc2000-000a-0000-0000-000000000003','cccc1000-0004-0000-0000-000000000003','11111111-0000-0000-0000-000000000010','2', now() - interval '29 days'),
-- Estimacion trazabilidad operativa
('cccc2000-000b-0000-0000-000000000001','cccc1000-0005-0000-0000-000000000001','11111111-0000-0000-0000-000000000010','5', now() - interval '9 days'),
('cccc2000-000b-0000-0000-000000000002','cccc1000-0005-0000-0000-000000000001','11111111-0000-0000-0000-000000000008','5', now() - interval '9 days'),
('cccc2000-000b-0000-0000-000000000003','cccc1000-0005-0000-0000-000000000001','11111111-0000-0000-0000-000000000004','3', now() - interval '9 days'),
('cccc2000-000c-0000-0000-000000000001','cccc1000-0005-0000-0000-000000000002','11111111-0000-0000-0000-000000000010','8', now() - interval '2 days'),
('cccc2000-000c-0000-0000-000000000002','cccc1000-0005-0000-0000-000000000002','11111111-0000-0000-0000-000000000008','13',now() - interval '2 days'),
('cccc2000-000c-0000-0000-000000000003','cccc1000-0005-0000-0000-000000000002','11111111-0000-0000-0000-000000000004','8', now() - interval '2 days'),
-- Canal D2C (baraja de tallas: sin estimacion numerica)
('cccc2000-000d-0000-0000-000000000001','cccc1000-0007-0000-0000-000000000001','11111111-0000-0000-0000-000000000011','M', now() - interval '12 days'),
('cccc2000-000d-0000-0000-000000000002','cccc1000-0007-0000-0000-000000000001','11111111-0000-0000-0000-000000000012','M', now() - interval '12 days'),
('cccc2000-000e-0000-0000-000000000001','cccc1000-0007-0000-0000-000000000002','11111111-0000-0000-0000-000000000011','L', now() - interval '12 days'),
('cccc2000-000e-0000-0000-000000000002','cccc1000-0007-0000-0000-000000000002','11111111-0000-0000-0000-000000000012','XL',now() - interval '12 days');

COMMIT;