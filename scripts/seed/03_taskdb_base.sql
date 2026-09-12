-- ============================================================================
--  Nexora Consulting — Seed 03: taskdb (parte 1)
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
                                                     ('99999999-0001-0000-0000-000000000001','55555555-0000-0000-0000-000000000001','integracion','#3B82F6'),
                                                     ('99999999-0001-0000-0000-000000000002','55555555-0000-0000-0000-000000000001','experiencia-cliente','#8B5CF6'),
                                                     ('99999999-0001-0000-0000-000000000003','55555555-0000-0000-0000-000000000001','bug',            '#EF4444'),
                                                     ('99999999-0001-0000-0000-000000000004','55555555-0000-0000-0000-000000000001','usabilidad','#EC4899'),
                                                     ('99999999-0001-0000-0000-000000000005','55555555-0000-0000-0000-000000000001','deuda-tecnica',  '#F59E0B'),
                                                     ('99999999-0001-0000-0000-000000000006','55555555-0000-0000-0000-000000000001','documentacion',  '#10B981'),
                                                     ('99999999-0002-0000-0000-000000000001','55555555-0000-0000-0000-000000000002','integraciones','#3B82F6'),
                                                     ('99999999-0002-0000-0000-000000000002','55555555-0000-0000-0000-000000000002','seguridad',      '#EF4444'),
                                                     ('99999999-0002-0000-0000-000000000003','55555555-0000-0000-0000-000000000002','rendimiento','#F59E0B'),
                                                     ('99999999-0002-0000-0000-000000000004','55555555-0000-0000-0000-000000000002','operaciones','#14B8A6'),
                                                     ('99999999-0003-0000-0000-000000000001','55555555-0000-0000-0000-000000000003','area-cliente','#8B5CF6'),
                                                     ('99999999-0003-0000-0000-000000000002','55555555-0000-0000-0000-000000000003','experiencia-cliente','#EC4899'),
                                                     ('99999999-0003-0000-0000-000000000003','55555555-0000-0000-0000-000000000003','bug',            '#EF4444'),
                                                     ('99999999-0004-0000-0000-000000000001','55555555-0000-0000-0000-000000000004','operaciones','#0EA5E9'),
                                                     ('99999999-0004-0000-0000-000000000002','55555555-0000-0000-0000-000000000004','seguridad',      '#EF4444'),
                                                     ('99999999-0005-0000-0000-000000000001','55555555-0000-0000-0000-000000000005','documentacion',  '#10B981'),
                                                     ('99999999-0006-0000-0000-000000000001','55555555-0000-0000-0000-000000000006','canal-digital','#8B5CF6'),
                                                     ('99999999-0006-0000-0000-000000000002','55555555-0000-0000-0000-000000000006','crecimiento','#F59E0B');

-- ---------------------------------------------------------------------------
-- 3. Epicas
-- ---------------------------------------------------------------------------
INSERT INTO epics (id, project_id, name, description, color, status, start_date, target_date, created_by, created_at, updated_at) VALUES
                                                                                                                                      ('66666666-0001-0000-0000-000000000001','55555555-0000-0000-0000-000000000001','Gestion del expediente','Bandeja operativa, actuaciones, dependencias, historial y seguimiento del siniestro.','#6366F1','IN_PROGRESS',(now() - interval '45 days')::date,(now() + interval '20 days')::date,'a21a40cb-6b69-42a0-b790-b576df0641ec',now() - interval '50 days',now() - interval '2 days'),
                                                                                                                                      ('66666666-0001-0000-0000-000000000002','55555555-0000-0000-0000-000000000001','Valoracion colaborativa','Valoracion en tiempo real con peritos, comparativa de resultados y registro del consenso.','#8B5CF6','IN_PROGRESS',(now() - interval '12 days')::date,(now() + interval '25 days')::date,'a21a40cb-6b69-42a0-b790-b576df0641ec',now() - interval '35 days',now() - interval '1 days'),
                                                                                                                                      ('66666666-0001-0000-0000-000000000003','55555555-0000-0000-0000-000000000001','Red de talleres y peritos','Integracion con proveedores externos, eventos y trazabilidad del expediente.','#F59E0B','OPEN',(now() + interval '5 days')::date,(now() + interval '60 days')::date,'11111111-0000-0000-0000-000000000001',now() - interval '20 days',now() - interval '5 days'),
                                                                                                                                      ('66666666-0001-0000-0000-000000000004','55555555-0000-0000-0000-000000000001','Acceso y perfiles','Alta, acceso seguro, recuperacion de cuenta, perfiles y permisos.','#10B981','DONE',(now() - interval '60 days')::date,(now() - interval '31 days')::date,'a21a40cb-6b69-42a0-b790-b576df0641ec',now() - interval '65 days',now() - interval '31 days'),
                                                                                                                                      ('66666666-0002-0000-0000-000000000001','55555555-0000-0000-0000-000000000002','Pedidos y stock omnicanal','Modelo comun de pedidos, stock, partners y contratos de integracion.','#0EA5E9','IN_PROGRESS',(now() - interval '28 days')::date,(now() + interval '15 days')::date,'11111111-0000-0000-0000-000000000002',now() - interval '32 days',now() - interval '2 days'),
                                                                                                                                      ('66666666-0002-0000-0000-000000000002','55555555-0000-0000-0000-000000000002','Operacion y trazabilidad','Metricas, trazabilidad, healthchecks y alertas del ecosistema omnicanal.','#EF4444','OPEN',(now() - interval '7 days')::date,(now() + interval '40 days')::date,'11111111-0000-0000-0000-000000000010',now() - interval '25 days',now() - interval '3 days'),
                                                                                                                                      ('66666666-0003-0000-0000-000000000001','55555555-0000-0000-0000-000000000003','Area de cliente v1','Primera version funcional: acceso, contratos, solicitudes y documentacion.','#8B5CF6','IN_PROGRESS',(now() - interval '20 days')::date,(now() + interval '30 days')::date,'11111111-0000-0000-0000-000000000001',now() - interval '30 days',now() - interval '3 days');

-- ---------------------------------------------------------------------------
-- 4. Sprints
-- ---------------------------------------------------------------------------
INSERT INTO sprints (id, project_id, name, goal, status, start_date, end_date,
                     review_notes, closed_total_tasks, closed_done_tasks, closed_incomplete_tasks,
                     closed_total_story_points, closed_done_story_points, created_at, updated_at) VALUES
                                                                                                      ('77777777-0001-0000-0000-000000000001','55555555-0000-0000-0000-000000000001','Sprint 1 — Acceso y perfiles','Cerrar el acceso seguro, perfiles y permisos basicos para asegurados y tramitadores.','COMPLETED',(now() - interval '45 days')::date,(now() - interval '31 days')::date,'{"technique":"START_STOP_CONTINUE","answers":{"start":"Acordar criterios de aceptacion con negocio antes de estimar cada historia.\nReservar una sesion semanal para revisar riesgos de datos y seguridad.","stop":"Abrir cambios sin asociarlos al expediente funcional que los justifica.\nCerrar decisiones de UX sin validar antes con tramitadores.","continue":"Daily breve centrada en bloqueos y dependencias externas.\nRevisiones en pareja para los cambios con impacto en reglas de negocio."}}',8,8,0,32,32,now() - interval '48 days',now() - interval '31 days'),
                                                                                                      ('77777777-0001-0000-0000-000000000002','55555555-0000-0000-0000-000000000001','Sprint 2 — Tramitacion operativa','Disponer de una bandeja de siniestros usable de punta a punta con prioridad y seguimiento.','COMPLETED',(now() - interval '31 days')::date,(now() - interval '17 days')::date,'{"technique":"FOUR_LS","answers":{"loved":"La demo con tramitadores permitio validar el flujo completo de un siniestro.\nLos filtros por prioridad redujeron mucho el tiempo de busqueda.","learned":"La bandeja necesita datos realistas para descubrir problemas de volumen y orden.\nLa accesibilidad del drag and drop debe tratarse desde el inicio.","lacked":"Falto tiempo de validacion con usuarios al final del sprint.\nNecesitamos mas casos con expedientes complejos y actuaciones dependientes.","longedFor":"Tener pruebas end-to-end de los recorridos criticos.\nEntrar al siguiente sprint con la valoracion colaborativa ya refinada."}}',8,6,2,53,42,now() - interval '33 days',now() - interval '17 days'),
                                                                                                      ('77777777-0001-0000-0000-000000000003','55555555-0000-0000-0000-000000000001','Sprint 3 — Valoracion colaborativa','Permitir que varios peritos valoren un siniestro en tiempo real y registren un consenso.','ACTIVE',(now() - interval '10 days')::date,(now() + interval '4 days')::date,NULL,NULL,NULL,NULL,NULL,NULL,now() - interval '13 days',now() - interval '1 days'),
                                                                                                      ('77777777-0001-0000-0000-000000000004','55555555-0000-0000-0000-000000000001','Sprint 4 — Red de proveedores','Conectar talleres y peritos externos con la trazabilidad del expediente.','PLANNING',(now() + interval '5 days')::date,(now() + interval '19 days')::date,NULL,NULL,NULL,NULL,NULL,NULL,now() - interval '4 days',now() - interval '1 days'),
                                                                                                      ('77777777-0002-0000-0000-000000000001','55555555-0000-0000-0000-000000000002','Sprint 1 — Pedidos y stock','Publicar el modelo comun de pedidos y stock y completar el flujo principal.','COMPLETED',(now() - interval '28 days')::date,(now() - interval '14 days')::date,'{"technique":"MAD_SAD_GLAD","answers":{"mad":"El modelo de datos de uno de los partners cambio despues de cerrar el contrato de integracion.\nDependimos varios dias de credenciales de un tercero.","sad":"No automatizamos todavia la validacion completa de todos los contratos de partner.\nParte de la documentacion operativa quedo por detras de la implementacion.","glad":"Adelantamos la paginacion de pedidos y catalogo.\nLa integracion principal quedo cubierta con pruebas desde el primer sprint."}}',5,5,0,25,25,now() - interval '30 days',now() - interval '14 days'),
                                                                                                      ('77777777-0002-0000-0000-000000000002','55555555-0000-0000-0000-000000000002','Sprint 2 — Partners y trazabilidad','Credenciales de partners, webhooks, metricas y trazabilidad operativa.','ACTIVE',(now() - interval '7 days')::date,(now() + interval '7 days')::date,NULL,NULL,NULL,NULL,NULL,NULL,now() - interval '10 days',now() - interval '2 days'),
                                                                                                      ('77777777-0003-0000-0000-000000000001','55555555-0000-0000-0000-000000000003','Sprint 1 — Autoservicio cliente','Acceso, resumen de contratos y alta de solicitudes funcionando con datos reales.','ACTIVE',(now() - interval '5 days')::date,(now() + interval '9 days')::date,NULL,NULL,NULL,NULL,NULL,NULL,now() - interval '8 days',now() - interval '3 days'),
                                                                                                      ('77777777-0004-0000-0000-000000000001','55555555-0000-0000-0000-000000000004','Sprint 1 — Visibilidad operativa','Ingesta de expediciones, estados normalizados y primera vista de seguimiento.','PLANNING',(now() + interval '3 days')::date,(now() + interval '17 days')::date,NULL,NULL,NULL,NULL,NULL,NULL,now() - interval '6 days',now() - interval '2 days'),
                                                                                                      ('77777777-0006-0000-0000-000000000001','55555555-0000-0000-0000-000000000006','Sprint 1 — Salida al mercado','Publicar la primera version del canal D2C con captacion conectada al CRM.','ACTIVE',(now() - interval '9 days')::date,(now() + interval '5 days')::date,NULL,NULL,NULL,NULL,NULL,NULL,now() - interval '12 days',now() - interval '2 days');

COMMIT;