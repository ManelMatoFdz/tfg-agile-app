-- ============================================================================
--  AgileFlow — Seed 03: taskdb (parte 1)
--  Limpieza + columnas de tablero, etiquetas, epicas y sprints.
-- ============================================================================

BEGIN;

TRUNCATE TABLE task_labels, task_dependencies, task_activities, task_comments,
               git_events, git_integrations, sprint_task_snapshots,
               tasks, labels, epics, sprints, board_columns CASCADE;

-- ---------------------------------------------------------------------------
-- 1. Columnas de tablero (4 por proyecto)
-- ---------------------------------------------------------------------------
INSERT INTO board_columns (id, project_id, name, "position", color, done_equivalent, wip_limit)
SELECT
    ('aaaaaaaa-000' || p.n || '-0000-0000-00000000000' || c.n)::uuid,
    p.id::uuid, c.name, c.pos, c.color, c.done, c.wip
FROM (VALUES
    (1,'55555555-0000-0000-0000-000000000001'),
    (2,'55555555-0000-0000-0000-000000000002'),
    (3,'55555555-0000-0000-0000-000000000003'),
    (4,'55555555-0000-0000-0000-000000000004'),
    (5,'55555555-0000-0000-0000-000000000005'),
    (6,'55555555-0000-0000-0000-000000000006')
) AS p(n, id)
CROSS JOIN (VALUES
    (1,'TODO',       0,'#94A3B8',false,NULL::int),
    (2,'IN_PROGRESS',1,'#3B82F6',false,5),
    (3,'IN_REVIEW',  2,'#F59E0B',false,3),
    (4,'DONE',       3,'#10B981',true, NULL)
) AS c(n, name, pos, color, done, wip);

-- ---------------------------------------------------------------------------
-- 2. Etiquetas
-- ---------------------------------------------------------------------------
INSERT INTO labels (id, project_id, name, color) VALUES
('99999999-0001-0000-0000-000000000001','55555555-0000-0000-0000-000000000001','backend',        '#3B82F6'),
('99999999-0001-0000-0000-000000000002','55555555-0000-0000-0000-000000000001','frontend',       '#8B5CF6'),
('99999999-0001-0000-0000-000000000003','55555555-0000-0000-0000-000000000001','bug',            '#EF4444'),
('99999999-0001-0000-0000-000000000004','55555555-0000-0000-0000-000000000001','ux',             '#EC4899'),
('99999999-0001-0000-0000-000000000005','55555555-0000-0000-0000-000000000001','deuda-tecnica',  '#F59E0B'),
('99999999-0001-0000-0000-000000000006','55555555-0000-0000-0000-000000000001','documentacion',  '#10B981'),
('99999999-0002-0000-0000-000000000001','55555555-0000-0000-0000-000000000002','backend',        '#3B82F6'),
('99999999-0002-0000-0000-000000000002','55555555-0000-0000-0000-000000000002','seguridad',      '#EF4444'),
('99999999-0002-0000-0000-000000000003','55555555-0000-0000-0000-000000000002','performance',    '#F59E0B'),
('99999999-0002-0000-0000-000000000004','55555555-0000-0000-0000-000000000002','observabilidad', '#14B8A6'),
('99999999-0003-0000-0000-000000000001','55555555-0000-0000-0000-000000000003','frontend',       '#8B5CF6'),
('99999999-0003-0000-0000-000000000002','55555555-0000-0000-0000-000000000003','ux',             '#EC4899'),
('99999999-0003-0000-0000-000000000003','55555555-0000-0000-0000-000000000003','bug',            '#EF4444'),
('99999999-0004-0000-0000-000000000001','55555555-0000-0000-0000-000000000004','infra',          '#0EA5E9'),
('99999999-0004-0000-0000-000000000002','55555555-0000-0000-0000-000000000004','seguridad',      '#EF4444'),
('99999999-0005-0000-0000-000000000001','55555555-0000-0000-0000-000000000005','documentacion',  '#10B981'),
('99999999-0006-0000-0000-000000000001','55555555-0000-0000-0000-000000000006','frontend',       '#8B5CF6'),
('99999999-0006-0000-0000-000000000002','55555555-0000-0000-0000-000000000006','seo',            '#F59E0B');

-- ---------------------------------------------------------------------------
-- 3. Epicas
-- ---------------------------------------------------------------------------
INSERT INTO epics (id, project_id, name, description, color, status, start_date, target_date, created_by, created_at, updated_at) VALUES
('66666666-0001-0000-0000-000000000001','55555555-0000-0000-0000-000000000001','Gestion de tareas','Tablero Kanban, backlog, subtareas, dependencias y epicas.','#6366F1','IN_PROGRESS',(now() - interval '45 days')::date,(now() + interval '20 days')::date,'ca8bb86d-46e6-44ed-9f77-4e841be4de8a',now() - interval '50 days',now() - interval '2 days'),
('66666666-0001-0000-0000-000000000002','55555555-0000-0000-0000-000000000001','Estimacion colaborativa','Planning Poker en tiempo real e integracion con story points.','#8B5CF6','IN_PROGRESS',(now() - interval '12 days')::date,(now() + interval '25 days')::date,'ca8bb86d-46e6-44ed-9f77-4e841be4de8a',now() - interval '35 days',now() - interval '1 days'),
('66666666-0001-0000-0000-000000000003','55555555-0000-0000-0000-000000000001','Integraciones externas','Conexion con GitHub/GitLab, webhooks y trazabilidad de commits.','#F59E0B','OPEN',(now() + interval '5 days')::date,(now() + interval '60 days')::date,'11111111-0000-0000-0000-000000000001',now() - interval '20 days',now() - interval '5 days'),
('66666666-0001-0000-0000-000000000004','55555555-0000-0000-0000-000000000001','Autenticacion y cuentas','Registro, login JWT, recuperacion de contrasena y perfil.','#10B981','DONE',(now() - interval '60 days')::date,(now() - interval '31 days')::date,'ca8bb86d-46e6-44ed-9f77-4e841be4de8a',now() - interval '65 days',now() - interval '31 days'),
('66666666-0002-0000-0000-000000000001','55555555-0000-0000-0000-000000000002','API publica v1','Contrato OpenAPI, CRUD, paginacion y autenticacion por API key.','#0EA5E9','IN_PROGRESS',(now() - interval '28 days')::date,(now() + interval '15 days')::date,'11111111-0000-0000-0000-000000000002',now() - interval '32 days',now() - interval '2 days'),
('66666666-0002-0000-0000-000000000002','55555555-0000-0000-0000-000000000002','Observabilidad','Metricas, trazas, healthchecks y alertas.','#EF4444','OPEN',(now() - interval '7 days')::date,(now() + interval '40 days')::date,'11111111-0000-0000-0000-000000000010',now() - interval '25 days',now() - interval '3 days'),
('66666666-0003-0000-0000-000000000001','55555555-0000-0000-0000-000000000003','Portal cliente v1','Primera version funcional del portal: login, dashboard y tickets.','#8B5CF6','IN_PROGRESS',(now() - interval '20 days')::date,(now() + interval '30 days')::date,'11111111-0000-0000-0000-000000000001',now() - interval '30 days',now() - interval '3 days');

-- ---------------------------------------------------------------------------
-- 4. Sprints
-- ---------------------------------------------------------------------------
INSERT INTO sprints (id, project_id, name, goal, status, start_date, end_date,
                     review_notes, closed_total_tasks, closed_done_tasks, closed_incomplete_tasks,
                     closed_total_story_points, closed_done_story_points, created_at, updated_at) VALUES
('77777777-0001-0000-0000-000000000001','55555555-0000-0000-0000-000000000001','Sprint 1 — Fundaciones','Cerrar el flujo completo de autenticacion y perfil de usuario.','COMPLETED',(now() - interval '45 days')::date,(now() - interval '31 days')::date,'{"technique":"START_STOP_CONTINUE","answers":{"start":"Escribir los criterios de aceptacion antes de estimar; en varias historias los descubrimos a mitad de sprint.\nReservar la ultima hora del viernes para revisar la deuda tecnica acumulada.","stop":"Abrir ramas sin asociarlas a una tarea: perdimos trazabilidad en dos PRs.\nEstimar en la misma reunion en la que se refina, llegamos cansados y a la baja.","continue":"El daily de 15 minutos con foco en bloqueos, ha funcionado muy bien.\nLas revisiones de codigo en parejas: el tiempo de PR abierta bajo de 2 dias a menos de 1."}}',8,8,0,32,32,now() - interval '48 days',now() - interval '31 days'),
('77777777-0001-0000-0000-000000000002','55555555-0000-0000-0000-000000000001','Sprint 2 — Kanban y Backlog','Tablero Kanban usable de punta a punta con backlog ordenable.','COMPLETED',(now() - interval '31 days')::date,(now() - interval '17 days')::date,'{"technique":"FOUR_LS","answers":{"loved":"Ver el tablero funcionando de punta a punta en la demo; el feedback del PO fue inmediato.\nLa libreria de drag & drop elegida encajo mejor de lo esperado con los estados del Kanban.","learned":"Que el drag & drop tiene mucho mas coste oculto del que parece: accesibilidad, touch y persistencia del orden.\nQue conviene medir el rendimiento del tablero con 200+ tareas antes de darlo por cerrado.","lacked":"Nos falto un entorno de pruebas con datos realistas; el bug de orden aparecio solo con muchos elementos.\nFalto tiempo de QA al final del sprint, entramos justos.","longedFor":"Tener tests e2e del tablero para no depender de pruebas manuales.\nEntrar al siguiente sprint con las dos historias devueltas ya refinadas y estimadas."}}',8,6,2,53,42,now() - interval '33 days',now() - interval '17 days'),
('77777777-0001-0000-0000-000000000003','55555555-0000-0000-0000-000000000001','Sprint 3 — Planning Poker','Sesiones de estimacion en tiempo real integradas con las tareas.','ACTIVE',(now() - interval '10 days')::date,(now() + interval '4 days')::date,NULL,NULL,NULL,NULL,NULL,NULL,now() - interval '13 days',now() - interval '1 days'),
('77777777-0001-0000-0000-000000000004','55555555-0000-0000-0000-000000000001','Sprint 4 — Integraciones','Conectar el proyecto con un repositorio Git real.','PLANNING',(now() + interval '5 days')::date,(now() + interval '19 days')::date,NULL,NULL,NULL,NULL,NULL,NULL,now() - interval '4 days',now() - interval '1 days'),
('77777777-0002-0000-0000-000000000001','55555555-0000-0000-0000-000000000002','Sprint API 1 — Contrato','Publicar el contrato OpenAPI y el CRUD principal.','COMPLETED',(now() - interval '28 days')::date,(now() - interval '14 days')::date,'{"technique":"MAD_SAD_GLAD","answers":{"mad":"El contrato OpenAPI cambio dos veces despues de estar acordado y hubo que rehacer los DTOs.\nDependimos de una respuesta de infraestructura que tardo cuatro dias.","sad":"No conseguimos automatizar la generacion del cliente a partir del contrato, sigue siendo manual.\nLa documentacion quedo desactualizada respecto al codigo al cerrar el sprint.","glad":"Adelantamos la paginacion estandar que estaba planificada para la siguiente iteracion.\nEl CRUD principal quedo cubierto con tests de integracion desde el primer dia."}}',5,5,0,25,25,now() - interval '30 days',now() - interval '14 days'),
('77777777-0002-0000-0000-000000000002','55555555-0000-0000-0000-000000000002','Sprint API 2 — Seguridad y metricas','API keys, webhooks salientes y observabilidad basica.','ACTIVE',(now() - interval '7 days')::date,(now() + interval '7 days')::date,NULL,NULL,NULL,NULL,NULL,NULL,now() - interval '10 days',now() - interval '2 days'),
('77777777-0003-0000-0000-000000000001','55555555-0000-0000-0000-000000000003','Sprint Portal 1','Login y dashboard de tickets funcionando con datos reales.','ACTIVE',(now() - interval '5 days')::date,(now() + interval '9 days')::date,NULL,NULL,NULL,NULL,NULL,NULL,now() - interval '8 days',now() - interval '3 days'),
('77777777-0004-0000-0000-000000000001','55555555-0000-0000-0000-000000000004','Sprint Infra 1','Pipeline de CI verde y imagenes optimizadas.','PLANNING',(now() + interval '3 days')::date,(now() + interval '17 days')::date,NULL,NULL,NULL,NULL,NULL,NULL,now() - interval '6 days',now() - interval '2 days'),
('77777777-0006-0000-0000-000000000001','55555555-0000-0000-0000-000000000006','Sprint 1 — Lanzamiento','Publicar la landing con formulario de contacto operativo.','ACTIVE',(now() - interval '9 days')::date,(now() + interval '5 days')::date,NULL,NULL,NULL,NULL,NULL,NULL,now() - interval '12 days',now() - interval '2 days');

COMMIT;