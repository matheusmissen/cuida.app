-- Cuida: o check-in diário começa às 8h (docs/PRD.md, seção 4: "O lembrete chega às 8h; o responsável pode
-- mudar o horário"). Só muda o padrão de quem for cadastrado daqui em diante; quem já existe fica como está.
alter table public.pacientes alter column horario_checkin set default '08:00';
