create table notification_settings (
    in_app_notifications_enabled boolean not null,
    project_updates_enabled boolean not null,
    task_reminders_enabled boolean not null,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    user_id uuid not null,
    primary key (user_id)
);

create table notifications (
    is_read boolean not null,
    created_at timestamp(6) with time zone not null,
    id uuid not null,
    user_id uuid not null,
    type varchar(100) not null,
    title varchar(200) not null,
    link varchar(500),
    data varchar(2000),
    message varchar(2000) not null,
    primary key (id)
);

create table password_reset_tokens (
    created_at timestamp(6) with time zone not null,
    expires_at timestamp(6) with time zone not null,
    used_at timestamp(6) with time zone,
    id uuid not null,
    user_id uuid not null,
    token_hash varchar(128) not null,
    primary key (id),
    constraint uk_password_reset_tokens_token_hash unique (token_hash)
);

create table refresh_tokens (
    user_token_version integer not null,
    created_at timestamp(6) with time zone not null,
    expires_at timestamp(6) with time zone not null,
    revoked_at timestamp(6) with time zone,
    id uuid not null,
    user_id uuid not null,
    token_hash varchar(128) not null,
    primary key (id),
    constraint uk_refresh_tokens_token_hash unique (token_hash)
);

create table user_avatars (
    updated_at timestamp(6) with time zone not null,
    user_id uuid not null,
    content_type varchar(100) not null,
    image_data bytea not null,
    primary key (user_id)
);

create table users (
    has_local_password boolean default true not null,
    token_version integer default 0 not null,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone,
    id uuid not null,
    full_name varchar(120),
    avatar_url varchar(500),
    bio varchar(1200),
    email varchar(255) not null,
    password_hash varchar(255) not null,
    username varchar(255) not null,
    primary key (id),
    constraint uk_users_email unique (email)
);

create index idx_notifications_user_created_at on notifications (user_id, created_at);
create index idx_notifications_user_is_read_created_at on notifications (user_id, is_read, created_at);

alter table if exists notification_settings
    add constraint fkmh6alfw96lc851ea0snhijfk
    foreign key (user_id)
    references users;

alter table if exists notifications
    add constraint fk9y21adhxn0ayjhfocscqox7bh
    foreign key (user_id)
    references users;

alter table if exists password_reset_tokens
    add constraint fkk3ndxg5xp6v7wd4gjyusp15gq
    foreign key (user_id)
    references users;

alter table if exists refresh_tokens
    add constraint fk1lih5y2npsf8u5o3vhdb9y0os
    foreign key (user_id)
    references users;

alter table if exists user_avatars
    add constraint fkh03scppjwu7ge4p9wj9ap92jx
    foreign key (user_id)
    references users;
