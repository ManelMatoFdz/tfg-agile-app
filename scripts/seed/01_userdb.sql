-- ============================================================================
--  AgileFlow — Seed 01: userdb (user-service)
--  Borra todos los usuarios salvo `darkoclemente` y crea 12 usuarios de demo.
--  Password de todos los usuarios generados: Password123!
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Limpieza (se preserva el usuario darkoclemente y su sesion activa)
-- ---------------------------------------------------------------------------
DELETE FROM notifications;
DELETE FROM password_reset_tokens;
DELETE FROM refresh_tokens        WHERE user_id <> 'ca8bb86d-46e6-44ed-9f77-4e841be4de8a';
DELETE FROM notification_settings WHERE user_id <> 'ca8bb86d-46e6-44ed-9f77-4e841be4de8a';
DELETE FROM user_avatars          WHERE user_id <> 'ca8bb86d-46e6-44ed-9f77-4e841be4de8a';
DELETE FROM users                 WHERE id      <> 'ca8bb86d-46e6-44ed-9f77-4e841be4de8a';

-- ---------------------------------------------------------------------------
-- 2. Usuarios de demo
-- ---------------------------------------------------------------------------
INSERT INTO users (id, username, email, password_hash, full_name, bio, avatar_url,
                   token_version, has_local_password, created_at, updated_at) VALUES
('11111111-0000-0000-0000-000000000001','laura.vidal','laura.vidal@agileflow.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Laura Vidal','Product Owner. Me obsesiona el porque antes que el como.','/avatars/demo/laura-vidal.webp',0,true,now() - interval '180 days',now() - interval '3 days'),
('11111111-0000-0000-0000-000000000002','sergio.rey','sergio.rey@agileflow.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Sergio Rey','Backend engineer. Java, Spring y mucho cafe.','/avatars/demo/sergio-rey.webp',0,true,now() - interval '175 days',now() - interval '5 days'),
('11111111-0000-0000-0000-000000000003','marta.otero','marta.otero@agileflow.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Marta Otero','Frontend developer. React, accesibilidad y design systems.','/avatars/demo/marta-otero.webp',0,true,now() - interval '170 days',now() - interval '1 days'),
('11111111-0000-0000-0000-000000000004','diego.blanco','diego.blanco@agileflow.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Diego Blanco','Full-stack. Me gusta borrar codigo mas que escribirlo.','/avatars/demo/diego-blanco.webp',0,true,now() - interval '165 days',now() - interval '2 days'),
('11111111-0000-0000-0000-000000000005','ana.figueroa','ana.figueroa@agileflow.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Ana Figueroa','Scrum Master y facilitadora. Menos reuniones, mas foco.','/avatars/demo/ana-figueroa.webp',0,true,now() - interval '160 days',now() - interval '4 days'),
('11111111-0000-0000-0000-000000000006','pablo.souto','pablo.souto@agileflow.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Pablo Souto','Frontend. Animaciones, micro-interacciones y CSS moderno.','/avatars/demo/pablo-souto.webp',0,true,now() - interval '150 days',now() - interval '6 days'),
('11111111-0000-0000-0000-000000000007','nerea.castro','nerea.castro@agileflow.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Nerea Castro','QA engineer. Si no hay test, no ha pasado.','/avatars/demo/nerea-castro.webp',0,true,now() - interval '140 days',now() - interval '8 days'),
('11111111-0000-0000-0000-000000000008','ivan.pereira','ivan.pereira@agileflow.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Ivan Pereira','DevOps. Docker, Kubernetes y pipelines que no fallan a las 3am.','/avatars/demo/ivan-pereira.webp',0,true,now() - interval '135 days',now() - interval '9 days'),
('11111111-0000-0000-0000-000000000009','carla.mendez','carla.mendez@agileflow.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Carla Mendez','Product designer. Investigacion, prototipos y mucho Figma.','/avatars/demo/carla-mendez.webp',0,true,now() - interval '130 days',now() - interval '1 days'),
('11111111-0000-0000-0000-000000000010','hugo.varela','hugo.varela@agileflow.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Hugo Varela','Backend / datos. SQL, metricas y observabilidad.','/avatars/demo/hugo-varela.webp',0,true,now() - interval '120 days',now() - interval '12 days'),
('11111111-0000-0000-0000-000000000011','elena.rios','elena.rios@agileflow.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Elena Rios','Web developer freelance. Landing pages que convierten.','/avatars/demo/elena-rios.webp',0,true,now() - interval '95 days',now() - interval '7 days'),
('11111111-0000-0000-0000-000000000012','tomas.neira','tomas.neira@agileflow.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Tomas Neira','Marketing tecnico. SEO, analitica y contenidos.','/avatars/demo/tomas-neira.webp',0,true,now() - interval '90 days',now() - interval '14 days');

-- ---------------------------------------------------------------------------
-- 3. Preferencias de notificaciones (una fila por usuario, incluido darko)
-- ---------------------------------------------------------------------------
INSERT INTO notification_settings (user_id, email_notifications_enabled, in_app_notifications_enabled,
                                   project_updates_enabled, task_reminders_enabled, created_at, updated_at)
SELECT u.id, true, true, true, true, now() - interval '90 days', now() - interval '10 days'
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM notification_settings ns WHERE ns.user_id = u.id);

-- Algun usuario con las notificaciones por email desactivadas (datos mas realistas)
UPDATE notification_settings SET email_notifications_enabled = false
WHERE user_id IN ('11111111-0000-0000-0000-000000000006',
                  '11111111-0000-0000-0000-000000000010',
                  '11111111-0000-0000-0000-000000000012');

-- ---------------------------------------------------------------------------
-- 4. Notificaciones
-- ---------------------------------------------------------------------------
INSERT INTO notifications (id, user_id, type, title, message, link, data, is_read, created_at) VALUES
-- darkoclemente
('dddddddd-0000-0000-0000-000000000001','ca8bb86d-46e6-44ed-9f77-4e841be4de8a','PROJECT_UPDATE','Te han anadido a AgileFlow Web','Laura Vidal te ha anadido al proyecto AgileFlow Web.','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000001/board','{"actorUserId":"11111111-0000-0000-0000-000000000001"}',true,now() - interval '46 days'),
('dddddddd-0000-0000-0000-000000000002','ca8bb86d-46e6-44ed-9f77-4e841be4de8a','TASK_REMINDER','Tarea proxima a vencer','La tarea "Sala de votacion en tiempo real (WebSocket)" vence en 2 dias.','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000001/board',NULL,true,now() - interval '9 days'),
('dddddddd-0000-0000-0000-000000000003','ca8bb86d-46e6-44ed-9f77-4e841be4de8a','POKER_INVITATION','Sesion de Planning Poker','Ana Figueroa ha abierto la sesion "Estimacion backlog integraciones".','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000001/poker/cccccccc-0001-0000-0000-000000000002','{"actorUserId":"11111111-0000-0000-0000-000000000005"}',true,now() - interval '6 days'),
('dddddddd-0000-0000-0000-000000000004','ca8bb86d-46e6-44ed-9f77-4e841be4de8a','TASK_REMINDER','Nueva tarea asignada','Se te ha asignado "Pantalla de repositorio con actividad Git".','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000001/board','{"actorUserId":"11111111-0000-0000-0000-000000000001"}',false,now() - interval '4 days'),
('dddddddd-0000-0000-0000-000000000005','ca8bb86d-46e6-44ed-9f77-4e841be4de8a','TASK_REMINDER','Tarea desbloqueada','"Vincular commits y ramas a tareas" ya no esta bloqueada.','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000001/board',NULL,false,now() - interval '3 days'),
('dddddddd-0000-0000-0000-000000000006','ca8bb86d-46e6-44ed-9f77-4e841be4de8a','TASK_REMINDER','Tarea vencida','La tarea "Sincronizar estimacion final con story points" ha superado su fecha limite.','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000001/board',NULL,false,now() - interval '2 days'),
('dddddddd-0000-0000-0000-000000000007','ca8bb86d-46e6-44ed-9f77-4e841be4de8a','PROJECT_UPDATE','Sprint activado','El Sprint 3 — Planning Poker esta activo en AgileFlow Web.','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000001/sprints',NULL,false,now() - interval '10 days'),
('dddddddd-0000-0000-0000-000000000008','ca8bb86d-46e6-44ed-9f77-4e841be4de8a','WORKSPACE_INVITATION','Invitacion aceptada','Te has unido al workspace Lumen Studio.','/workspaces',NULL,true,now() - interval '60 days'),
('dddddddd-0000-0000-0000-000000000009','ca8bb86d-46e6-44ed-9f77-4e841be4de8a','PROJECT_UPDATE','Nuevo comentario','Marta Otero ha comentado en "Dependencias entre tareas".','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000001/board','{"actorUserId":"11111111-0000-0000-0000-000000000003"}',false,now() - interval '1 days'),
('dddddddd-0000-0000-0000-00000000000a','ca8bb86d-46e6-44ed-9f77-4e841be4de8a','TASK_REMINDER','Pull request abierta','Nueva PR #47 vinculada a "Reveal de cartas y estadisticas".','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000001/repository',NULL,false,now() - interval '12 hours'),
-- otros usuarios
('dddddddd-0000-0000-0000-000000000011','11111111-0000-0000-0000-000000000003','TASK_REMINDER','Nueva tarea asignada','Se te ha asignado "Adjuntar archivos a un ticket".','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000003/board','{"actorUserId":"11111111-0000-0000-0000-000000000001"}',false,now() - interval '5 days'),
('dddddddd-0000-0000-0000-000000000012','11111111-0000-0000-0000-000000000002','TASK_REMINDER','Tarea proxima a vencer','La tarea "Trazas distribuidas con OpenTelemetry" vence manana.','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000002/board',NULL,false,now() - interval '1 days'),
('dddddddd-0000-0000-0000-000000000013','11111111-0000-0000-0000-000000000005','POKER_INVITATION','Sesion de Planning Poker','Laura Vidal ha abierto la sesion "Estimacion portal".','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000003/poker/cccccccc-0003-0000-0000-000000000001','{"actorUserId":"11111111-0000-0000-0000-000000000001"}',false,now() - interval '2 days'),
('dddddddd-0000-0000-0000-000000000014','11111111-0000-0000-0000-000000000011','PROJECT_UPDATE','Sprint activado','El Sprint 1 — Lanzamiento esta activo en Lumen Landing.','/workspaces/22222222-0000-0000-0000-000000000002/projects/55555555-0000-0000-0000-000000000006/sprints',NULL,true,now() - interval '9 days'),
('dddddddd-0000-0000-0000-000000000015','11111111-0000-0000-0000-000000000007','WORKSPACE_INVITATION','Invitacion pendiente','Laura Vidal te ha invitado al workspace Lumen Studio.','/workspaces','{"invitationId":"22221111-0000-0000-0000-000000000006","workspaceId":"22222222-0000-0000-0000-000000000002","workspaceName":"Lumen Studio","actorUserId":"11111111-0000-0000-0000-000000000001"}',false,now() - interval '20 days');

COMMIT;
