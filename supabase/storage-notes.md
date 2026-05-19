# 图片存储说明

当前公网 MVP 为了最快迁移，会继续把图片以 base64 形式保存在 `app_state.data` 里。

这能跑通公网共享，但不适合长期大量图片，因为 JSON 会越来越大。

正式版建议下一步改成：

- 图片文件存到 Supabase Storage bucket：`attachments`
- 数据库里只保存图片路径、文件名、所属记录、是否共享
- 私密图片通过后端签名 URL 或 Storage policy 控制访问

建议表：

```sql
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  record_id text not null,
  round_id text,
  question_id text,
  file_name text not null,
  storage_path text not null,
  shared boolean not null default false,
  created_at timestamptz not null default now()
);
```

