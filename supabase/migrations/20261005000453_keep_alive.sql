create or replace function public.keep_alive()
returns int
language sql
set search_path = ''
as $$ select 1; $$;

grant execute on function public.keep_alive() to anon;
