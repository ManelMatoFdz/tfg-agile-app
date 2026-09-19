-- ============================================================================
--  Nexora Consulting — Seed 06: taskdb — etiquetas, dependencias, comentarios,
--  actividad y snapshots de sprints cerrados.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Etiquetas por tarea
-- ---------------------------------------------------------------------------
INSERT INTO task_labels (task_id, label_id) VALUES
-- P1
('770a04bb-2e9b-4ea0-868d-6107372a9e20','99999999-0001-0000-0000-000000000002'),
('0faf867d-1d82-410d-aac9-bee4514d189c','99999999-0001-0000-0000-000000000001'),
('19f983d2-6488-48ae-b252-577166eac8a9','99999999-0001-0000-0000-000000000001'),
('3778ddc6-b35e-40b2-8508-a83ce5fec8a8','99999999-0001-0000-0000-000000000001'),
('5835dac5-07fd-4cdc-8035-82383b86fd72','99999999-0001-0000-0000-000000000002'),
('5835dac5-07fd-4cdc-8035-82383b86fd72','99999999-0001-0000-0000-000000000004'),
('db25982a-1995-4883-89bf-5a30d31034ba','99999999-0001-0000-0000-000000000002'),
('8a249d02-1791-43a7-8a71-a12ac9b02604','99999999-0001-0000-0000-000000000003'),
('b7a19467-b7e0-4c6a-81b0-1c6d4e619c22','99999999-0001-0000-0000-000000000006'),
('ab368fd0-cbff-43b1-bc0d-68ac721b2294','99999999-0001-0000-0000-000000000002'),
('ab368fd0-cbff-43b1-bc0d-68ac721b2294','99999999-0001-0000-0000-000000000004'),
('1a95a4a9-d512-4c10-a870-9a3d1fe4ddf1','99999999-0001-0000-0000-000000000002'),
('c0fb6da0-d5d5-40d9-9856-bf32f4b1a891','99999999-0001-0000-0000-000000000002'),
('beacccd2-e037-4108-a979-07da4a24a38b','99999999-0001-0000-0000-000000000002'),
('07c46ad3-1656-430d-9904-f583db7c1fb3','99999999-0001-0000-0000-000000000001'),
('4cf81577-07a6-4fa6-8af3-f892388f65f6','99999999-0001-0000-0000-000000000001'),
('014e1ada-bf40-4236-bb9e-4a948f52925d','99999999-0001-0000-0000-000000000002'),
('94c0e7e1-adee-49a0-8370-0dd9b49a15f9','99999999-0001-0000-0000-000000000003'),
('b1a62c76-e506-4d6a-88f1-6856e653381e','99999999-0001-0000-0000-000000000002'),
('e944e69e-b22e-4aa3-97d0-0bcb1edf18e6','99999999-0001-0000-0000-000000000001'),
('5204dc17-3d4f-4437-ba29-2a68510fdf3f','99999999-0001-0000-0000-000000000002'),
('62270cf0-349c-4f90-80a8-018dfaa10202','99999999-0001-0000-0000-000000000001'),
('67622bd7-3623-48c6-90b9-5687faccdafa','99999999-0001-0000-0000-000000000003'),
('6195ef1a-acec-4f61-8ad0-62097878ded3','99999999-0001-0000-0000-000000000003'),
('6195ef1a-acec-4f61-8ad0-62097878ded3','99999999-0001-0000-0000-000000000002'),
('be43fbdd-1840-4ae7-a834-28f77ac78733','99999999-0001-0000-0000-000000000001'),
('d30ed862-f953-465e-b093-4a35b5df50de','99999999-0001-0000-0000-000000000001'),
('b8a87beb-dd29-4e8e-aa01-04a2e526869e','99999999-0001-0000-0000-000000000002'),
('c70bbb99-eced-4b45-a406-d96e1780b030','99999999-0001-0000-0000-000000000004'),
('4d46816d-32b7-4ee7-9925-1184dee35d3d','99999999-0001-0000-0000-000000000004'),
('76e6082a-aa75-4784-a4fe-7abd13728517','99999999-0001-0000-0000-000000000005'),
-- P2
('0ce1ac99-6359-4386-9786-5aead1c7abfd','99999999-0002-0000-0000-000000000001'),
('89a8d44f-d2b5-4f4f-8953-b5bb7d641fbe','99999999-0002-0000-0000-000000000003'),
('c133211b-7341-4dfe-816a-f8247a1c5591','99999999-0002-0000-0000-000000000002'),
('39c5afef-aead-428a-82c1-2907940f02ce','99999999-0002-0000-0000-000000000001'),
('29890dcc-fc7c-47bf-b8e9-759b2f765784','99999999-0002-0000-0000-000000000002'),
('141a0edf-febc-4c6c-9dff-1100b8e43814','99999999-0002-0000-0000-000000000004'),
('f6820514-2613-422f-8542-b5dbf14f676c','99999999-0002-0000-0000-000000000004'),
('2efb59a1-7a0c-46d4-994a-192dad9ebd0d','99999999-0002-0000-0000-000000000003'),
('0a29a414-9e88-49e4-9133-fefb73ef4a28','99999999-0002-0000-0000-000000000004'),
('0361b329-f092-4128-a4e9-31d4a907e2ff','99999999-0002-0000-0000-000000000002'),
-- P3 / P4 / P6
('33327975-66ec-4cbe-9cb1-8f7e7c482033','99999999-0003-0000-0000-000000000001'),
('31f1a6b5-a1e3-42d1-a1c3-7db6031d871b','99999999-0003-0000-0000-000000000001'),
('5239e490-c95e-461c-9c3e-87e080689c4f','99999999-0003-0000-0000-000000000003'),
('1237c373-2db6-41fc-9a15-07aeff24d872','99999999-0003-0000-0000-000000000002'),
('7f4fcb4f-8c1a-4623-bb7d-c83029cc826b','99999999-0003-0000-0000-000000000002'),
('e7006b7e-e1cc-498f-a515-29034e351af7','99999999-0004-0000-0000-000000000001'),
('44e5f181-bb54-4419-9569-0e1a365424ee','99999999-0004-0000-0000-000000000001'),
('102cff51-222e-41ee-bf2c-b856583d2e29','99999999-0004-0000-0000-000000000001'),
('3f2e7f10-0283-4da9-b277-30ecc56e8871','99999999-0004-0000-0000-000000000002'),
('f6a76965-f311-4af9-93e6-7c701a8551a6','99999999-0005-0000-0000-000000000001'),
('5b68a0db-1f7e-4b3e-bf5f-4a38860716e0','99999999-0006-0000-0000-000000000001'),
('5d6cd73c-c088-4fc6-8881-65a3bcbbe489','99999999-0006-0000-0000-000000000002'),
('d835ec18-fc06-456a-afcd-d5d9e3458c06','99999999-0006-0000-0000-000000000002');

-- ---------------------------------------------------------------------------
-- 2. Dependencias entre actuaciones
-- ---------------------------------------------------------------------------
INSERT INTO task_dependencies (id, blocking_task_id, blocked_task_id, created_by, created_at) VALUES
                                                                                                  ('deadbeef-0000-0000-0000-000000000001','be43fbdd-1840-4ae7-a834-28f77ac78733','d30ed862-f953-465e-b093-4a35b5df50de','a21a40cb-6b69-42a0-b790-b576df0641ec',now() - interval '18 days'),
                                                                                                  ('deadbeef-0000-0000-0000-000000000002','d30ed862-f953-465e-b093-4a35b5df50de','b8a87beb-dd29-4e8e-aa01-04a2e526869e','a21a40cb-6b69-42a0-b790-b576df0641ec',now() - interval '18 days'),
                                                                                                  ('deadbeef-0000-0000-0000-000000000003','be43fbdd-1840-4ae7-a834-28f77ac78733','f2794546-2ce3-4ce3-8089-7f299748018a','11111111-0000-0000-0000-000000000001',now() - interval '15 days'),
                                                                                                  ('deadbeef-0000-0000-0000-000000000004','5204dc17-3d4f-4437-ba29-2a68510fdf3f','62270cf0-349c-4f90-80a8-018dfaa10202','a21a40cb-6b69-42a0-b790-b576df0641ec',now() - interval '12 days'),
                                                                                                  ('deadbeef-0000-0000-0000-000000000005','e944e69e-b22e-4aa3-97d0-0bcb1edf18e6','5204dc17-3d4f-4437-ba29-2a68510fdf3f','11111111-0000-0000-0000-000000000001',now() - interval '12 days'),
                                                                                                  ('deadbeef-0000-0000-0000-000000000006','c0fb6da0-d5d5-40d9-9856-bf32f4b1a891','098736ac-498b-4129-96c6-614a603466ea','a21a40cb-6b69-42a0-b790-b576df0641ec',now() - interval '16 days'),
                                                                                                  ('deadbeef-0000-0000-0000-000000000007','014e1ada-bf40-4236-bb9e-4a948f52925d','4d46816d-32b7-4ee7-9925-1184dee35d3d','11111111-0000-0000-0000-000000000003',now() - interval '9 days'),
                                                                                                  ('deadbeef-0000-0000-0000-000000000008','29890dcc-fc7c-47bf-b8e9-759b2f765784','ea6becb5-d134-4d6f-847b-264a6443fac2','a21a40cb-6b69-42a0-b790-b576df0641ec',now() - interval '10 days'),
                                                                                                  ('deadbeef-0000-0000-0000-000000000009','141a0edf-febc-4c6c-9dff-1100b8e43814','1382fdb5-4ff0-4353-a308-83931d9497c3','11111111-0000-0000-0000-000000000002',now() - interval '9 days'),
                                                                                                  ('deadbeef-0000-0000-0000-00000000000a','147bfe10-18b2-4644-b664-e3f012fda7df','e58a4a66-cbed-4632-857c-469b1793113d','11111111-0000-0000-0000-000000000002',now() - interval '14 days'),
                                                                                                  ('deadbeef-0000-0000-0000-00000000000b','9d4b8c2b-bfc4-47c9-8065-ba1054b6b56f','33327975-66ec-4cbe-9cb1-8f7e7c482033','11111111-0000-0000-0000-000000000001',now() - interval '8 days'),
                                                                                                  ('deadbeef-0000-0000-0000-00000000000c','31f1a6b5-a1e3-42d1-a1c3-7db6031d871b','5f9e3421-2953-490a-bd93-8ec7e48dfba6','11111111-0000-0000-0000-000000000001',now() - interval '7 days'),
                                                                                                  ('deadbeef-0000-0000-0000-00000000000d','e7006b7e-e1cc-498f-a515-29034e351af7','44e5f181-bb54-4419-9569-0e1a365424ee','a21a40cb-6b69-42a0-b790-b576df0641ec',now() - interval '6 days'),
                                                                                                  ('deadbeef-0000-0000-0000-00000000000e','44e5f181-bb54-4419-9569-0e1a365424ee','102cff51-222e-41ee-bf2c-b856583d2e29','a21a40cb-6b69-42a0-b790-b576df0641ec',now() - interval '5 days'),
                                                                                                  ('deadbeef-0000-0000-0000-00000000000f','a88cc8e0-b195-4943-911f-648821f6318b','1d6dfa81-8e1c-4e2b-8e47-a5dd8c72ca86','11111111-0000-0000-0000-000000000001',now() - interval '9 days');

-- ---------------------------------------------------------------------------
-- 3. Comentarios
-- ---------------------------------------------------------------------------
INSERT INTO task_comments (id, task_id, author_id, content, created_at, edited_at) VALUES
                                                                                       ('cafe0000-0000-0000-0000-000000000001','0faf867d-1d82-410d-aac9-bee4514d189c','11111111-0000-0000-0000-000000000001','Ojo con la caducidad de la sesion: 15 minutos es demasiado corto para una tramitacion real.',now() - interval '44 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-000000000002','0faf867d-1d82-410d-aac9-bee4514d189c','11111111-0000-0000-0000-000000000006','Subido a 30 minutos y la renovacion a 7 dias. Queda documentado en las decisiones tecnicas.',now() - interval '43 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-000000000003','ab368fd0-cbff-43b1-bc0d-68ac721b2294','11111111-0000-0000-0000-000000000009','El arrastre en pantallas pequenas es incomodo, deberiamos abrir una tarea aparte.',now() - interval '26 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-000000000004','ab368fd0-cbff-43b1-bc0d-68ac721b2294','11111111-0000-0000-0000-000000000003','De acuerdo, lo saco a "Accesibilidad: navegacion por teclado en la bandeja".',now() - interval '25 days',now() - interval '25 days'),
                                                                                       ('cafe0000-0000-0000-0000-000000000005','014e1ada-bf40-4236-bb9e-4a948f52925d','a21a40cb-6b69-42a0-b790-b576df0641ec','No entra en el sprint 2, vuelve al backlog con la estimacion revisada.',now() - interval '17 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-000000000006','e944e69e-b22e-4aa3-97d0-0bcb1edf18e6','11111111-0000-0000-0000-000000000006','El broker en memoria nos vale para el piloto. Si escalamos a varias instancias, revisamos la mensajeria.',now() - interval '11 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-000000000007','e944e69e-b22e-4aa3-97d0-0bcb1edf18e6','a21a40cb-6b69-42a0-b790-b576df0641ec','Perfecto, lo dejamos como limitacion conocida en la documentacion tecnica.',now() - interval '10 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-000000000008','5204dc17-3d4f-4437-ba29-2a68510fdf3f','11111111-0000-0000-0000-000000000009','Anado desviacion tipica ademas de media y moda; ayuda a ver si las valoraciones estan realmente alineadas.',now() - interval '8 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-000000000009','67622bd7-3623-48c6-90b9-5687faccdafa','11111111-0000-0000-0000-000000000003','Reproducido: pasa solo si cerramos una ronda y abrimos otra sobre el mismo expediente.',now() - interval '5 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-00000000000a','48ec526f-5141-4fb3-b5b1-e66ba0e0e23b','11111111-0000-0000-0000-000000000003','La deteccion de ciclos deberia avisar en el propio selector, no al guardar.',now() - interval '2 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-00000000000b','48ec526f-5141-4fb3-b5b1-e66ba0e0e23b','11111111-0000-0000-0000-000000000006','Buena idea. Lo meto en la subtarea de UI.',now() - interval '1 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-00000000000c','b8a87beb-dd29-4e8e-aa01-04a2e526869e','a21a40cb-6b69-42a0-b790-b576df0641ec','Paginacion de 10 en 10 en todas las secciones de actividad de proveedores.',now() - interval '4 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-00000000000d','098736ac-498b-4129-96c6-614a603466ea','11111111-0000-0000-0000-000000000005','El historial del expediente ya guarda lo necesario; no hace falta una tabla adicional.',now() - interval '5 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-00000000000e','29890dcc-fc7c-47bf-b8e9-759b2f765784','11111111-0000-0000-0000-000000000002','Las credenciales de partner se muestran una sola vez; hay que dejarlo muy claro en la interfaz.',now() - interval '6 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-00000000000f','2efb59a1-7a0c-46d4-994a-192dad9ebd0d','11111111-0000-0000-0000-000000000010','Confirmado en las metricas: el pool se agota tras 40 minutos de carga.',now() - interval '3 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-000000000010','2efb59a1-7a0c-46d4-994a-192dad9ebd0d','11111111-0000-0000-0000-000000000004','Era una transaccion de solo lectura sin cerrar. Corrigiendo.',now() - interval '2 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-000000000011','33327975-66ec-4cbe-9cb1-8f7e7c482033','11111111-0000-0000-0000-000000000001','El cliente pide poder filtrar tambien por contrato, no solo por estado.',now() - interval '4 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-000000000012','5239e490-c95e-461c-9c3e-87e080689c4f','11111111-0000-0000-0000-000000000009','Pasa con clientes en zona horaria negativa. Normalizando a UTC en el backend.',now() - interval '2 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-000000000013','102cff51-222e-41ee-bf2c-b856583d2e29','11111111-0000-0000-0000-000000000008','Empezamos con una vista de mapa unica y luego separamos paneles si la operacion lo necesita.',now() - interval '4 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-000000000014','a88cc8e0-b195-4943-911f-648821f6318b','11111111-0000-0000-0000-000000000012','El cliente prefiere honeypot antes que captcha para reducir friccion en la captacion.',now() - interval '3 days',NULL),
                                                                                       ('cafe0000-0000-0000-0000-000000000015','5d6cd73c-c088-4fc6-8881-65a3bcbbe489','11111111-0000-0000-0000-000000000009','Con WebP y carga diferida ya vamos por 87. Falta reducir el bundle inicial.',now() - interval '1 days',NULL);

-- ---------------------------------------------------------------------------
-- 4. Actividad de tareas
-- ---------------------------------------------------------------------------
INSERT INTO task_activities (id, task_id, actor_id, type, old_value, new_value, created_at) VALUES
                                                                                                ('acaca000-0000-0000-0000-000000000001','e944e69e-b22e-4aa3-97d0-0bcb1edf18e6','a21a40cb-6b69-42a0-b790-b576df0641ec','CREATED',NULL,NULL,now() - interval '13 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000002','e944e69e-b22e-4aa3-97d0-0bcb1edf18e6','a21a40cb-6b69-42a0-b790-b576df0641ec','SPRINT_ADDED',NULL,'Sprint 3 — Valoracion colaborativa',now() - interval '13 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000003','e944e69e-b22e-4aa3-97d0-0bcb1edf18e6','11111111-0000-0000-0000-000000000001','ASSIGNEE_CHANGED',NULL,'Sergio Rey',now() - interval '12 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000004','e944e69e-b22e-4aa3-97d0-0bcb1edf18e6','11111111-0000-0000-0000-000000000002','STORY_POINTS_CHANGED','8','13',now() - interval '11 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000005','e944e69e-b22e-4aa3-97d0-0bcb1edf18e6','11111111-0000-0000-0000-000000000002','STATUS_CHANGED','TODO','IN_PROGRESS',now() - interval '10 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000006','e944e69e-b22e-4aa3-97d0-0bcb1edf18e6','11111111-0000-0000-0000-000000000002','SUBTASK_ADDED',NULL,'Canal WebSocket para valoraciones en tiempo real',now() - interval '13 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000007','e944e69e-b22e-4aa3-97d0-0bcb1edf18e6','11111111-0000-0000-0000-000000000002','SUBTASK_ADDED',NULL,'Cliente de tiempo real con reconexion automatica',now() - interval '12 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000008','5204dc17-3d4f-4437-ba29-2a68510fdf3f','11111111-0000-0000-0000-000000000009','STATUS_CHANGED','TODO','IN_PROGRESS',now() - interval '9 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000009','5204dc17-3d4f-4437-ba29-2a68510fdf3f','a21a40cb-6b69-42a0-b790-b576df0641ec','PRIORITY_CHANGED','MEDIUM','HIGH',now() - interval '8 days'),
                                                                                                ('acaca000-0000-0000-0000-00000000000a','62270cf0-349c-4f90-80a8-018dfaa10202','a21a40cb-6b69-42a0-b790-b576df0641ec','DEPENDENCY_ADDED',NULL,'Comparativa de valoraciones y dispersion',now() - interval '12 days'),
                                                                                                ('acaca000-0000-0000-0000-00000000000b','014e1ada-bf40-4236-bb9e-4a948f52925d','a21a40cb-6b69-42a0-b790-b576df0641ec','RETURNED_TO_BACKLOG','Sprint 2 — Tramitacion operativa',NULL,now() - interval '17 days'),
                                                                                                ('acaca000-0000-0000-0000-00000000000c','94c0e7e1-adee-49a0-8370-0dd9b49a15f9','a21a40cb-6b69-42a0-b790-b576df0641ec','RETURNED_TO_BACKLOG','Sprint 2 — Tramitacion operativa',NULL,now() - interval '17 days'),
                                                                                                ('acaca000-0000-0000-0000-00000000000d','ab368fd0-cbff-43b1-bc0d-68ac721b2294','11111111-0000-0000-0000-000000000003','STATUS_CHANGED','IN_REVIEW','DONE',now() - interval '21 days'),
                                                                                                ('acaca000-0000-0000-0000-00000000000e','1a95a4a9-d512-4c10-a870-9a3d1fe4ddf1','11111111-0000-0000-0000-000000000009','STATUS_CHANGED','IN_REVIEW','DONE',now() - interval '19 days'),
                                                                                                ('acaca000-0000-0000-0000-00000000000f','40a1886d-8dc0-45da-ba27-0ce1624c04c9','11111111-0000-0000-0000-000000000005','STATUS_CHANGED','IN_REVIEW','DONE',now() - interval '4 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000010','40a1886d-8dc0-45da-ba27-0ce1624c04c9','a21a40cb-6b69-42a0-b790-b576df0641ec','EPIC_CHANGED',NULL,'Gestion del expediente',now() - interval '13 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000011','48ec526f-5141-4fb3-b5b1-e66ba0e0e23b','11111111-0000-0000-0000-000000000004','STATUS_CHANGED','TODO','IN_PROGRESS',now() - interval '6 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000012','6195ef1a-acec-4f61-8ad0-62097878ded3','11111111-0000-0000-0000-000000000006','STATUS_CHANGED','IN_PROGRESS','DONE',now() - interval '2 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000013','be43fbdd-1840-4ae7-a834-28f77ac78733','a21a40cb-6b69-42a0-b790-b576df0641ec','READY_CHANGED','false','true',now() - interval '4 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000014','be43fbdd-1840-4ae7-a834-28f77ac78733','a21a40cb-6b69-42a0-b790-b576df0641ec','SPRINT_ADDED',NULL,'Sprint 4 — Red de proveedores',now() - interval '4 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000015','d30ed862-f953-465e-b093-4a35b5df50de','a21a40cb-6b69-42a0-b790-b576df0641ec','SPRINT_ADDED',NULL,'Sprint 4 — Red de proveedores',now() - interval '4 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000016','b8a87beb-dd29-4e8e-aa01-04a2e526869e','a21a40cb-6b69-42a0-b790-b576df0641ec','ASSIGNEE_CHANGED',NULL,'Manel Mato',now() - interval '4 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000017','b8a87beb-dd29-4e8e-aa01-04a2e526869e','a21a40cb-6b69-42a0-b790-b576df0641ec','LABEL_ADDED',NULL,'experiencia-cliente',now() - interval '4 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000018','29890dcc-fc7c-47bf-b8e9-759b2f765784','a21a40cb-6b69-42a0-b790-b576df0641ec','CREATED',NULL,NULL,now() - interval '10 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000019','29890dcc-fc7c-47bf-b8e9-759b2f765784','11111111-0000-0000-0000-000000000004','STATUS_CHANGED','TODO','IN_PROGRESS',now() - interval '5 days'),
                                                                                                ('acaca000-0000-0000-0000-00000000001a','ea6becb5-d134-4d6f-847b-264a6443fac2','11111111-0000-0000-0000-000000000002','STORY_POINTS_CHANGED','8','13',now() - interval '3 days'),
                                                                                                ('acaca000-0000-0000-0000-00000000001b','2efb59a1-7a0c-46d4-994a-192dad9ebd0d','11111111-0000-0000-0000-000000000004','PRIORITY_CHANGED','HIGH','CRITICAL',now() - interval '2 days'),
                                                                                                ('acaca000-0000-0000-0000-00000000001c','0a29a414-9e88-49e4-9133-fefb73ef4a28','11111111-0000-0000-0000-000000000008','STATUS_CHANGED','IN_REVIEW','DONE',now() - interval '3 days'),
                                                                                                ('acaca000-0000-0000-0000-00000000001d','9d4b8c2b-bfc4-47c9-8065-ba1054b6b56f','11111111-0000-0000-0000-000000000009','STATUS_CHANGED','IN_REVIEW','DONE',now() - interval '2 days'),
                                                                                                ('acaca000-0000-0000-0000-00000000001e','31f1a6b5-a1e3-42d1-a1c3-7db6031d871b','11111111-0000-0000-0000-000000000006','STATUS_CHANGED','IN_PROGRESS','IN_REVIEW',now() - interval '1 days'),
                                                                                                ('acaca000-0000-0000-0000-00000000001f','5239e490-c95e-461c-9c3e-87e080689c4f','11111111-0000-0000-0000-000000000007','CREATED',NULL,NULL,now() - interval '3 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000020','e7006b7e-e1cc-498f-a515-29034e351af7','a21a40cb-6b69-42a0-b790-b576df0641ec','SPRINT_ADDED',NULL,'Sprint 1 — Visibilidad operativa',now() - interval '2 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000021','c73addd2-d2f9-4cb8-86e1-ba6c34a9b94e','11111111-0000-0000-0000-000000000008','STATUS_CHANGED','IN_PROGRESS','IN_REVIEW',now() - interval '1 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000022','5b68a0db-1f7e-4b3e-bf5f-4a38860716e0','11111111-0000-0000-0000-000000000011','STATUS_CHANGED','IN_REVIEW','DONE',now() - interval '4 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000023','5d6cd73c-c088-4fc6-8881-65a3bcbbe489','11111111-0000-0000-0000-000000000009','STATUS_CHANGED','TODO','IN_PROGRESS',now() - interval '2 days'),
                                                                                                ('acaca000-0000-0000-0000-000000000024','a88cc8e0-b195-4943-911f-648821f6318b','11111111-0000-0000-0000-000000000012','STATUS_CHANGED','IN_PROGRESS','IN_REVIEW',now() - interval '1 days');

-- ---------------------------------------------------------------------------
-- 5. Snapshots de los sprints cerrados
-- ---------------------------------------------------------------------------
-- Sprint 1 de Orion Seguros · Gestion de Siniestros (todo completado)
INSERT INTO sprint_task_snapshots (id, sprint_id, task_id, parent_task_id, title, description, type,
                                   priority, story_points, status_at_end, completed, returned_to_backlog,
                                   due_date, completed_at, created_at)
SELECT ('5aa55007-0001-0000-0000-' || substr(t.id::text, 25))::uuid,
    '77777777-0001-0000-0000-000000000001', t.id, t.parent_id, t.title, t.description, t.type,
       t.priority, t.story_points, 'DONE', true, false, t.due_date, t.completed_at,
       now() - interval '31 days'
FROM tasks t WHERE t.sprint_id = '77777777-0001-0000-0000-000000000001';

-- Sprint 2 de Orion Seguros · Gestion de Siniestros (6 completadas)
INSERT INTO sprint_task_snapshots (id, sprint_id, task_id, parent_task_id, title, description, type,
                                   priority, story_points, status_at_end, completed, returned_to_backlog,
                                   due_date, completed_at, created_at)
SELECT ('5aa55007-0002-0000-0000-' || substr(t.id::text, 25))::uuid,
    '77777777-0001-0000-0000-000000000002', t.id, t.parent_id, t.title, t.description, t.type,
       t.priority, t.story_points, 'DONE', true, false, t.due_date, t.completed_at,
       now() - interval '17 days'
FROM tasks t WHERE t.sprint_id = '77777777-0001-0000-0000-000000000002';

-- Sprint 2: las dos historias que volvieron al backlog
INSERT INTO sprint_task_snapshots (id, sprint_id, task_id, parent_task_id, title, description, type,
                                   priority, story_points, status_at_end, completed, returned_to_backlog,
                                   due_date, completed_at, created_at) VALUES
                                                                           ('5aa55007-0002-0000-0000-00000000000f','77777777-0001-0000-0000-000000000002','014e1ada-bf40-4236-bb9e-4a948f52925d',NULL,'Actuaciones asociadas al siniestro','Jerarquia de un nivel para dividir un expediente en actuaciones de peritacion, documentacion y seguimiento.','STORY','HIGH',8,'IN_PROGRESS',false,true,NULL,NULL,now() - interval '17 days'),
                                                                           ('5aa55007-0002-0000-0000-000000000010','77777777-0001-0000-0000-000000000002','94c0e7e1-adee-49a0-8370-0dd9b49a15f9',NULL,'El orden de prioridad se pierde al recargar','La posicion de la cola se recalculaba en cliente y no se persistia al mover un expediente.','BUG','HIGH',3,'TODO',false,true,NULL,NULL,now() - interval '17 days');

-- Sprint 1 de Vega Retail · Operacion Omnicanal (todo completado)
INSERT INTO sprint_task_snapshots (id, sprint_id, task_id, parent_task_id, title, description, type,
                                   priority, story_points, status_at_end, completed, returned_to_backlog,
                                   due_date, completed_at, created_at)
SELECT ('5aa55007-0003-0000-0000-' || substr(t.id::text, 25))::uuid,
    '77777777-0002-0000-0000-000000000001', t.id, t.parent_id, t.title, t.description, t.type,
       t.priority, t.story_points, 'DONE', true, false, t.due_date, t.completed_at,
       now() - interval '14 days'
FROM tasks t WHERE t.sprint_id = '77777777-0002-0000-0000-000000000001';

COMMIT;