-- Fecha límite única para todas las preguntas de "Apuestas iniciales":
-- sábado 14 de agosto de 2026 a las 16:00 (hora de España peninsular, CEST =
-- UTC+2 en agosto). A partir de esa hora, QuestionCard las muestra en modo
-- solo lectura (mecanismo que ya existía para las preguntas semanales).
update public.season_questions
set closes_at = '2026-08-14T16:00:00+02:00'
where phase = 'initial';
