-- ============================================================================
--  Nexora Consulting — Seed 01: userdb (user-service)
--  Borra todos los usuarios salvo `darkoclemente` y crea 12 usuarios de demo.
--  Password de todos los usuarios generados: Password123!
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Limpieza (se preserva el usuario darkoclemente y su sesion activa)
-- ---------------------------------------------------------------------------
DELETE FROM notifications;
DELETE FROM password_reset_tokens;
DELETE FROM refresh_tokens        WHERE user_id <> 'a21a40cb-6b69-42a0-b790-b576df0641ec';
DELETE FROM notification_settings WHERE user_id <> 'a21a40cb-6b69-42a0-b790-b576df0641ec';
DELETE FROM user_avatars          WHERE user_id <> 'a21a40cb-6b69-42a0-b790-b576df0641ec';
DELETE FROM users                 WHERE id      <> 'a21a40cb-6b69-42a0-b790-b576df0641ec';

-- ---------------------------------------------------------------------------
-- 2. Usuarios de demo
-- ---------------------------------------------------------------------------
INSERT INTO users (id, username, email, password_hash, full_name, bio, avatar_url,
                   token_version, has_local_password, created_at, updated_at) VALUES
                                                                                  ('11111111-0000-0000-0000-000000000001','laura.vidal','laura.vidal@nexora-consulting.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Laura Vidal','Product Owner y consultora funcional. Conecto objetivos de negocio, usuarios y equipo.','/avatars/demo/laura-vidal.webp',0,true,now() - interval '180 days',now() - interval '3 days'),
                                                                                  ('11111111-0000-0000-0000-000000000002','sergio.rey','sergio.rey@nexora-consulting.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Sergio Rey','Consultor tecnico. Integraciones, arquitectura y servicios con foco en producto.','/avatars/demo/sergio-rey.webp',0,true,now() - interval '175 days',now() - interval '5 days'),
                                                                                  ('11111111-0000-0000-0000-000000000003','marta.castro','marta.castro@nexora-consulting.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Marta Castro','Consultora de producto digital. Experiencia de usuario, frontend y accesibilidad.','/avatars/demo/marta-castro.webp',0,true,now() - interval '170 days',now() - interval '1 days'),
                                                                                  ('11111111-0000-0000-0000-000000000004','diego.blanco','diego.blanco@nexora-consulting.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Diego Blanco','Ingeniero de producto full-stack. Automatizacion, integraciones y soluciones simples.','/avatars/demo/diego-blanco.webp',0,true,now() - interval '165 days',now() - interval '2 days'),
                                                                                  ('11111111-0000-0000-0000-000000000005','ana.figueroa','ana.figueroa@nexora-consulting.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Ana Figueroa','Scrum Master y facilitadora. Mejora continua, foco y colaboracion con cliente.','/avatars/demo/ana-figueroa.webp',0,true,now() - interval '160 days',now() - interval '4 days'),
                                                                                  ('11111111-0000-0000-0000-000000000006','pablo.souto','pablo.souto@nexora-consulting.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Pablo Souto','Ingeniero de producto. Interfaces, experiencia digital y rendimiento web.','/avatars/demo/pablo-souto.webp',0,true,now() - interval '150 days',now() - interval '6 days'),
                                                                                  ('11111111-0000-0000-0000-000000000007','nerea.castro','nerea.castro@nexora-consulting.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Nerea Castro','Consultora de calidad. Automatizacion, pruebas exploratorias y criterios de aceptacion.','/avatars/demo/nerea-castro.webp',0,true,now() - interval '140 days',now() - interval '8 days'),
                                                                                  ('11111111-0000-0000-0000-000000000008','ivan.pereira','ivan.pereira@nexora-consulting.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Ivan Pereira','Consultor de plataforma. Cloud, automatizacion y fiabilidad de soluciones.','/avatars/demo/ivan-pereira.webp',0,true,now() - interval '135 days',now() - interval '9 days'),
                                                                                  ('11111111-0000-0000-0000-000000000009','carla.mendez','carla.mendez@nexora-consulting.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Carla Mendez','Service designer. Investigacion, prototipos y diseno de servicios de punta a punta.','/avatars/demo/carla-mendez.webp',0,true,now() - interval '130 days',now() - interval '1 days'),
                                                                                  ('11111111-0000-0000-0000-000000000010','hugo.varela','hugo.varela@nexora-consulting.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Hugo Varela','Consultor de datos. SQL, indicadores, trazabilidad y observabilidad de negocio.','/avatars/demo/hugo-varela.webp',0,true,now() - interval '120 days',now() - interval '12 days'),
                                                                                  ('11111111-0000-0000-0000-000000000011','elena.rios','elena.rios@nexora-consulting.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Elena Rios','Consultora de producto digital. Contenido, experiencia web y entrega end-to-end.','/avatars/demo/elena-rios.webp',0,true,now() - interval '95 days',now() - interval '7 days'),
                                                                                  ('11111111-0000-0000-0000-000000000012','tomas.neira','tomas.neira@nexora-consulting.dev','$2a$10$DAf7HWslPQR7SeDzjjfy.ed./A8WfeQv7baipq9M.WgjqnAEdQXd2','Tomas Neira','Consultor de growth. Analitica, SEO, contenidos y automatizacion comercial.','/avatars/demo/tomas-neira.webp',0,true,now() - interval '90 days',now() - interval '14 days');

-- ---------------------------------------------------------------------------
-- 3. Preferencias de notificaciones (una fila por usuario, incluido darko)
-- ---------------------------------------------------------------------------
INSERT INTO notification_settings (user_id, in_app_notifications_enabled,
                                   project_updates_enabled, task_reminders_enabled, created_at, updated_at)
SELECT u.id, true, true, true, now() - interval '90 days', now() - interval '10 days'
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM notification_settings ns WHERE ns.user_id = u.id);

-- ---------------------------------------------------------------------------
-- 4. Notificaciones
-- ---------------------------------------------------------------------------
INSERT INTO notifications (id, user_id, type, title, message, link, data, is_read, created_at) VALUES
-- darkoclemente
('dddddddd-0000-0000-0000-000000000001','a21a40cb-6b69-42a0-b790-b576df0641ec','PROJECT_UPDATE','Te han anadido a Orion Seguros · Gestion de Siniestros','Laura Vidal te ha anadido al proyecto Orion Seguros · Gestion de Siniestros.','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000001/board','{"actorUserId":"11111111-0000-0000-0000-000000000001"}',true,now() - interval '46 days'),
('dddddddd-0000-0000-0000-000000000003','a21a40cb-6b69-42a0-b790-b576df0641ec','POKER_INVITATION','Sesion de Planning Poker','Ana Figueroa ha abierto la sesion "Estimacion red de proveedores".','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000001/poker/cccccccc-0001-0000-0000-000000000002','{"actorUserId":"11111111-0000-0000-0000-000000000005"}',true,now() - interval '6 days'),
('dddddddd-0000-0000-0000-000000000004','a21a40cb-6b69-42a0-b790-b576df0641ec','TASK_REMINDER','Nueva tarea asignada','Se te ha asignado "Pantalla de actividad de talleres y peritos".','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000001/board','{"actorUserId":"11111111-0000-0000-0000-000000000001"}',false,now() - interval '4 days'),
('dddddddd-0000-0000-0000-000000000005','a21a40cb-6b69-42a0-b790-b576df0641ec','TASK_REMINDER','Tarea desbloqueada','"Vincular eventos de proveedores al expediente" ya no esta bloqueada.','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000001/board',NULL,false,now() - interval '3 days'),
('dddddddd-0000-0000-0000-000000000006','a21a40cb-6b69-42a0-b790-b576df0641ec','TASK_REMINDER','Tarea vencida','La tarea "Registrar valoracion consensuada en el expediente" ha superado su fecha limite.','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000001/board',NULL,false,now() - interval '2 days'),
('dddddddd-0000-0000-0000-000000000007','a21a40cb-6b69-42a0-b790-b576df0641ec','PROJECT_UPDATE','Sprint activado','El Sprint 3 — Valoracion colaborativa esta activo en Orion Seguros · Gestion de Siniestros.','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000001/sprints',NULL,false,now() - interval '10 days'),
('dddddddd-0000-0000-0000-000000000008','a21a40cb-6b69-42a0-b790-b576df0641ec','WORKSPACE_INVITATION','Invitacion aceptada','Te has unido al workspace Nexora Growth Lab.','/workspaces',NULL,true,now() - interval '60 days'),
('dddddddd-0000-0000-0000-000000000009','a21a40cb-6b69-42a0-b790-b576df0641ec','PROJECT_UPDATE','Nuevo comentario','Marta Castro ha comentado en "Dependencias entre actuaciones".','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000001/board','{"actorUserId":"11111111-0000-0000-0000-000000000003"}',false,now() - interval '1 days'),
('dddddddd-0000-0000-0000-00000000000a','a21a40cb-6b69-42a0-b790-b576df0641ec','TASK_REMINDER','Pull request abierta','Nueva PR #47 vinculada a "Comparativa de valoraciones y dispersion".','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000001/repository',NULL,false,now() - interval '12 hours'),
-- otros usuarios
('dddddddd-0000-0000-0000-000000000011','11111111-0000-0000-0000-000000000003','TASK_REMINDER','Nueva tarea asignada','Se te ha asignado "Adjuntar documentacion a una solicitud".','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000003/board','{"actorUserId":"11111111-0000-0000-0000-000000000001"}',false,now() - interval '5 days'),
('dddddddd-0000-0000-0000-000000000012','11111111-0000-0000-0000-000000000002','TASK_REMINDER','Tarea proxima a vencer','La tarea "Trazabilidad de pedido entre sistemas" vence manana.','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000002/board',NULL,false,now() - interval '1 days'),
('dddddddd-0000-0000-0000-000000000013','11111111-0000-0000-0000-000000000005','POKER_INVITATION','Sesion de Planning Poker','Laura Vidal ha abierto la sesion "Estimacion area de cliente".','/workspaces/22222222-0000-0000-0000-000000000001/projects/55555555-0000-0000-0000-000000000003/poker/cccccccc-0003-0000-0000-000000000001','{"actorUserId":"11111111-0000-0000-0000-000000000001"}',false,now() - interval '2 days'),
('dddddddd-0000-0000-0000-000000000014','11111111-0000-0000-0000-000000000011','PROJECT_UPDATE','Sprint activado','El Sprint 1 — Salida al mercado esta activo en Marea Foods · Canal D2C.','/workspaces/22222222-0000-0000-0000-000000000002/projects/55555555-0000-0000-0000-000000000006/sprints',NULL,true,now() - interval '9 days'),
('dddddddd-0000-0000-0000-000000000015','11111111-0000-0000-0000-000000000007','WORKSPACE_INVITATION','Invitacion pendiente','Laura Vidal te ha invitado al workspace Nexora Growth Lab.','/workspaces','{"invitationId":"22221111-0000-0000-0000-000000000006","workspaceId":"22222222-0000-0000-0000-000000000002","workspaceName":"Nexora Growth Lab","actorUserId":"11111111-0000-0000-0000-000000000001"}',false,now() - interval '20 days');

COMMIT;
