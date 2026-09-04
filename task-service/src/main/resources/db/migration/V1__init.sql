create table board_columns (
    done_equivalent boolean not null,
    position integer not null,
    wip_limit integer,
    color varchar(7),
    id uuid not null,
    project_id uuid not null,
    name varchar(50) not null,
    primary key (id),
    unique (project_id, position),
    unique (project_id, name)
);

create table epics (
    start_date date,
    target_date date,
    color varchar(7) not null,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by uuid not null,
    id uuid not null,
    project_id uuid not null,
    status varchar(20) not null check ((status in ('OPEN', 'IN_PROGRESS', 'DONE'))),
    description text,
    name varchar(255) not null,
    primary key (id)
);

create table git_events (
    received_at timestamp(6) with time zone not null,
    id uuid not null,
    project_id uuid not null,
    task_id uuid,
    status varchar(20),
    type varchar(20) not null check ((type in ('COMMIT', 'BRANCH', 'PULL_REQUEST'))),
    author varchar(255) not null,
    external_id varchar(255) not null,
    external_url varchar(255) not null,
    title text not null,
    primary key (id),
    unique (project_id, type, external_id)
);

create table git_integrations (
    created_at timestamp(6) with time zone not null,
    created_by uuid not null,
    id uuid not null,
    project_id uuid not null unique,
    provider varchar(20) not null check ((provider in ('GITHUB', 'GITLAB'))),
    repository_url varchar(255) not null,
    webhook_secret varchar(255) not null,
    primary key (id)
);

create table labels (
    color varchar(7) not null,
    id uuid not null,
    project_id uuid not null,
    name varchar(50) not null,
    primary key (id),
    unique (project_id, name)
);

create table sprint_task_snapshots (
    completed boolean not null,
    due_date date,
    returned_to_backlog boolean not null,
    story_points integer,
    completed_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone not null,
    type varchar(10) check ((type in ('STORY', 'TASK', 'BUG'))),
    id uuid not null,
    parent_task_id uuid,
    sprint_id uuid not null,
    task_id uuid,
    priority varchar(20) not null check ((priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))),
    status_at_end varchar(50) not null,
    description text,
    title varchar(255) not null,
    primary key (id)
);

create table sprints (
    closed_done_story_points integer,
    closed_done_tasks integer,
    closed_incomplete_tasks integer,
    closed_total_story_points integer,
    closed_total_tasks integer,
    end_date date,
    start_date date,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    id uuid not null,
    project_id uuid not null,
    status varchar(20) not null check ((status in ('PLANNING', 'ACTIVE', 'COMPLETED'))),
    goal text,
    name varchar(255) not null,
    review_notes text,
    primary key (id)
);

create table task_activities (
    created_at timestamp(6) with time zone not null,
    actor_id uuid,
    id uuid not null,
    task_id uuid not null,
    type varchar(30) not null check ((type in ('CREATED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'ASSIGNEE_CHANGED', 'SPRINT_ADDED', 'RETURNED_TO_BACKLOG', 'LABEL_ADDED', 'LABEL_REMOVED', 'SUBTASK_ADDED', 'SUBTASK_REMOVED', 'TITLE_CHANGED', 'DESCRIPTION_CHANGED', 'STORY_POINTS_CHANGED', 'READY_CHANGED', 'EPIC_CHANGED', 'DEPENDENCY_ADDED', 'DEPENDENCY_REMOVED'))),
    new_value varchar(500),
    old_value varchar(500),
    primary key (id)
);

create table task_comments (
    created_at timestamp(6) with time zone not null,
    edited_at timestamp(6) with time zone,
    author_id uuid not null,
    id uuid not null,
    task_id uuid not null,
    content text not null,
    primary key (id)
);

create table task_dependencies (
    created_at timestamp(6) with time zone not null,
    blocked_task_id uuid not null,
    blocking_task_id uuid not null,
    created_by uuid not null,
    id uuid not null,
    primary key (id),
    unique (blocking_task_id, blocked_task_id)
);

create table task_labels (
    label_id uuid not null,
    task_id uuid not null,
    primary key (label_id, task_id)
);

create table tasks (
    due_date date,
    position integer not null,
    ready boolean not null default false not null,
    story_points integer,
    completed_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    type varchar(10) not null check ((type in ('STORY', 'TASK', 'BUG'))),
    assignee_id uuid,
    epic_id uuid,
    id uuid not null,
    parent_id uuid,
    project_id uuid not null,
    reporter_id uuid not null,
    sprint_id uuid,
    priority varchar(20) not null check ((priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))),
    status varchar(50) not null,
    definition_of_done text,
    description text,
    title varchar(255) not null,
    primary key (id)
);

create index idx_git_events_task on git_events (task_id);
create index idx_git_events_project on git_events (project_id);

alter table if exists task_labels
    add constraint fklr49cbsj797rym78wepiid0sh
    foreign key (label_id)
    references labels;

alter table if exists task_labels
    add constraint fk7wi3dfqb8gx9kiysuy980sbus
    foreign key (task_id)
    references tasks;
