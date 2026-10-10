-- A series name and a sensor name are unique, ignoring case and spaces at the edges
-- ("Temp" and " temp " are the same name).
--
-- Databases that already ran 001 may hold duplicates, and the unique index would refuse to
-- build. So first the later ones (higher id) get " (#<id>)" appended, which is unique by the id;
-- the earliest keeps its name. The base is cut so the result still fits the 100 characters.

UPDATE series s
SET name = left(s.name, 100 - length(' (#' || s.id || ')')) || ' (#' || s.id || ')'
WHERE EXISTS (SELECT 1 FROM series o WHERE lower(btrim(o.name)) = lower(btrim(s.name)) AND o.id < s.id);

UPDATE sensors s
SET name = left(s.name, 100 - length(' (#' || s.id || ')')) || ' (#' || s.id || ')'
WHERE EXISTS (SELECT 1 FROM sensors o WHERE lower(btrim(o.name)) = lower(btrim(s.name)) AND o.id < s.id);

CREATE UNIQUE INDEX series_name_unique ON series (lower(btrim(name)));
CREATE UNIQUE INDEX sensors_name_unique ON sensors (lower(btrim(name)));
