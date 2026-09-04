create table categories (
    position integer not null,
    color varchar(7),
    created_at timestamp(6) with time zone not null,
    id uuid not null,
    workspace_id uuid not null,
    name varchar(100) not null,
    primary key (id)
);

create table projects (
    color varchar(7),
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    category_id uuid,
    id uuid not null,
    team_id uuid,
    workspace_id uuid not null,
    visibility varchar(20) not null check ((visibility in ('PRIVATE', 'WORKSPACE'))),
    name varchar(100) not null,
    description varchar(500),
    primary key (id)
);

create table team_members (
    joined_at timestamp(6) with time zone not null,
    last_active_at timestamp(6) with time zone,
    id uuid not null,
    team_id uuid not null,
    user_id uuid not null,
    scrum_role varchar(20) check ((scrum_role in ('PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER'))),
    role varchar(255) not null check ((role in ('ADMIN', 'MEMBER'))),
    primary key (id),
    constraint uk_team_members_team_user unique (team_id, user_id)
);

create table teams (
    color varchar(7),
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    id uuid not null,
    workspace_id uuid not null,
    name varchar(100) not null,
    description varchar(500),
    primary key (id)
);

create table workspace_invitations (
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    id uuid not null,
    invited_by_user_id uuid not null,
    invited_user_id uuid not null,
    workspace_id uuid not null,
    status varchar(20) not null check ((status in ('PENDING', 'ACCEPTED', 'REJECTED'))),
    invited_email varchar(255) not null,
    primary key (id),
    constraint uk_workspace_invitations_workspace_email_pending unique (workspace_id, invited_email, status)
);

create table workspace_members (
    joined_at timestamp(6) with time zone not null,
    id uuid not null,
    user_id uuid not null,
    workspace_id uuid not null,
    role varchar(20) not null check ((role in ('ADMIN', 'MEMBER'))),
    primary key (id),
    constraint uk_workspace_members_workspace_user unique (workspace_id, user_id)
);

create table workspaces (
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    id uuid not null,
    owner_id uuid not null,
    name varchar(100) not null,
    description varchar(500),
    primary key (id)
);

alter table if exists categories
    add constraint fk8375l0k9v16gb5l1rxp51y25k
    foreign key (workspace_id)
    references workspaces;

alter table if exists projects
    add constraint fk4sld861xurfwb6axyscs4x304
    foreign key (category_id)
    references categories;

alter table if exists projects
    add constraint fkmqih0928bq6r3gbuh47giq8w
    foreign key (team_id)
    references teams;

alter table if exists projects
    add constraint fkpc7qv7bnsq7dm17g0tb0a60of
    foreign key (workspace_id)
    references workspaces;

alter table if exists team_members
    add constraint fktgca08el3ofisywcf11f0f76t
    foreign key (team_id)
    references teams;

alter table if exists teams
    add constraint fk3ksevuicrwoqnr0xi3ewt7s11
    foreign key (workspace_id)
    references workspaces;

alter table if exists workspace_invitations
    add constraint fkcjk1r4awojk9f3vcc7gak8rnv
    foreign key (workspace_id)
    references workspaces;

alter table if exists workspace_members
    add constraint fkw9hq87n3rvq2c4j47qo78i5r
    foreign key (workspace_id)
    references workspaces;
