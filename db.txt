create table users (
    user_id serial primary key,
    username varchar(50) not null,
    email varchar(150) not null,
    password text not null,
    full_name varchar(100) not null,
    nickname varchar(50),
    profile_link text,
    avatar_url text,
    profile_picture text,
    cover_picture text,
    bio text,
    phone_number varchar(20),
    curr_institution varchar(150),
    address text,
    is_private boolean default false,
    num_friends integer default 0,
    created_at timestamp default current_timestamp,
    constraint users_email_key unique (email),
    constraint users_username_key unique (username),
    constraint users_profile_link_key unique (profile_link)
);

create table notifications (
    notification_id serial primary key,
    user_id integer not null,
    type varchar(50) not null,
    reference_id integer,
    created_at timestamp default current_timestamp,
    constraint notifications_user_id_fkey foreign key (user_id) references users(user_id) on delete cascade
);

create table message_reads (
    message_id integer not null,
    user_id integer not null,
    read_at timestamp default current_timestamp,
    primary key (message_id, user_id),
    constraint message_reads_message_id_fkey foreign key (message_id) references messages(message_id) on delete cascade,

    constraint message_reads_user_id_fkey foreign key (user_id) references users(user_id) on delete cascade
);

create table messages (
    message_id serial primary key,
    conversation_id int not null,
    sender_id int not null,
    content text not null,
    created_at timestamp default current_timestamp,
    foreign key (conversation_id) references conversations(conversation_id) on delete cascade,
    foreign key (sender_id) references users(user_id) on delete cascade
    );

create table conversations (
    conversation_id serial primary key,
    is_group boolean default false,
    created_at timestamp default current_timestamp
);

create table conversation_members (
    conversation_id int not null,
    user_id int not null,
    primary key (conversation_id, user_id),
    foreign key (conversation_id) references conversations(conversation_id) on delete cascade,
    foreign key (user_id) references users(user_id) on delete cascade
);

create table friend_requests (
    request_id serial,
    sender_id int not null,
    receiver_id int not null,
    status varchar(20) default 'pending',
    created_at timestamp default current_timestamp,
    primary key (request_id),
    unique (sender_id, receiver_id),
    foreign key (sender_id) references users(user_id) on delete cascade,
    foreign key (receiver_id) references users(user_id) on delete cascade
);

create table friends (
    user_id int not null,
    friend_id int not null,
    created_at timestamp default current_timestamp,
    primary key (user_id, friend_id),
    check (user_id <> friend_id),
    foreign key (user_id) references users(user_id) on delete cascade,
    foreign key (friend_id) references users(user_id) on delete cascade
);

create table blocks (
    blocker_id int not null,
    blocked_id int not null,
    created_at timestamp default current_timestamp,
    primary key (blocker_id, blocked_id),
    foreign key (blocker_id) references users(user_id),
    foreign key (blocked_id) references users(user_id)
);

create table comments (
    comment_id serial primary key,
    post_id int not null,
    user_id int not null,
    content text not null,
    created_at timestamp default current_timestamp,
    foreign key (post_id) references posts(post_id) on delete cascade,
    foreign key (user_id) references users(user_id) on delete cascade
);

create table comment_replies (
    reply_id serial primary key,
    comment_id int not null,
    user_id int not null,
    content text not null,
    created_at timestamp default current_timestamp,
    foreign key (comment_id) references comments(comment_id) on delete cascade,
    foreign key (user_id) references users(user_id) on delete cascade
);

create table posts (
    post_id serial primary key,
    user_id int not null,
    content text,
    image text,
    created_at timestamp default current_timestamp,
    foreign key (user_id) references users(user_id) on delete cascade
);

create table post_tags (
    post_id int not null,
    tagged_user_id int not null,
    primary key (post_id, tagged_user_id),
    foreign key (post_id) references posts(post_id) on delete cascade,
    foreign key (tagged_user_id) references users(user_id) on delete cascade
);

create table stories (
    story_id serial primary key,
    user_id int not null,
    media_url text not null,
    created_at timestamp default current_timestamp,
    expires_at timestamp not null,
    foreign key (user_id) references users(user_id) on delete cascade
);

create table story_views (
    story_id int not null,
    viewer_id int not null,
    viewed_at timestamp default current_timestamp,
    primary key (story_id, viewer_id),
    foreign key (story_id) references stories(story_id) on delete cascade,
    foreign key (viewer_id) references users(user_id) on delete cascade
);

create table likes (
    user_id int not null,
    post_id int not null,
    created_at timestamp default current_timestamp,
    primary key (user_id, post_id),
    foreign key (user_id) references users(user_id) on delete cascade,
    foreign key (post_id) references posts(post_id) on delete cascade
);

create table content_moderation (
    id serial primary key,
    target_type varchar(30) not null,
    target_id int not null,
    content text,
    reason text not null,
    confidence_score numeric(5,2),
    reviewed_at timestamp,
    created_at timestamp default current_timestamp
);
