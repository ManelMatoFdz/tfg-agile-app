create table poker_participants (
    connected boolean not null,
    joined_at timestamp(6) with time zone not null,
    role varchar(10) not null check ((role in ('VOTER', 'OBSERVER', 'MODERATOR'))),
    id uuid not null,
    session_id uuid not null,
    user_id uuid not null,
    display_name varchar(255) not null,
    primary key (id),
    unique (session_id, user_id)
);

create table poker_rounds (
    final_estimate integer,
    revealed_at timestamp(6) with time zone,
    started_at timestamp(6) with time zone not null,
    timer_ends_at timestamp(6) with time zone,
    id uuid not null,
    session_id uuid not null,
    task_id uuid not null,
    status varchar(20) not null check ((status in ('VOTING', 'REVEALED', 'CONSENSUS'))),
    task_title varchar(255) not null,
    primary key (id)
);

create table poker_sessions (
    timer_seconds integer,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by uuid not null,
    current_task_id uuid,
    id uuid not null,
    project_id uuid not null,
    deck varchar(20) not null check ((deck in ('FIBONACCI', 'T_SHIRT', 'POWERS_OF_2'))),
    status varchar(20) not null check ((status in ('LOBBY', 'VOTING', 'REVEALED', 'CLOSED'))),
    name varchar(255) not null,
    primary key (id)
);

create table poker_votes (
    voted_at timestamp(6) with time zone not null,
    value varchar(10) not null,
    id uuid not null,
    round_id uuid not null,
    user_id uuid not null,
    primary key (id),
    unique (round_id, user_id)
);

alter table if exists poker_participants
    add constraint fkl5kcf52iuqjmsuko9hr37jbvf
    foreign key (session_id)
    references poker_sessions;

alter table if exists poker_rounds
    add constraint fktoosyxykyp82pw04pygnf46gd
    foreign key (session_id)
    references poker_sessions;

alter table if exists poker_votes
    add constraint fko2j366dyu596eeyakj5ypl702
    foreign key (round_id)
    references poker_rounds;
