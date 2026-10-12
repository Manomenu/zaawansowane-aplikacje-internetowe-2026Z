# Lista kontrolna — SZKIC

Formularz listy kontrolnej na platformie Leia pyta, dla każdego elementu B1–B5 i każdego
rozszerzenia, czy jest zrealizowany i w której minucie nagrania go widać. Ten szkic ma
**planowane** minuty z `docs/recording.md`; każdy wiersz trzeba sprawdzić z prawdziwym nagraniem,
a dopiero potem przepisać do formularza. „Deklaracja” to zamiar, do weryfikacji po nagraniu.

| Element | Deklaracja | Minuta (planowana) | Gdzie w repozytorium |
| --- | --- | --- | --- |
| B1 / F1 wynik = liczba + czas + seria, tylko od czujników | tak | 3:00 | `pomiary_server/pomiary_server/measurements/` (żadna ścieżka nie edytuje wyniku) |
| B1 / F2 serie: przedział, kolor/ikona, kolumna i krzywa | tak | 0:35, 2:15 | `pomiary_web/src/series/`, `pomiary_web/src/dashboard/` |
| B1 / F3 role: czytelnik i administrator | tak | 0:50 | `pomiary_server/pomiary_server/auth/api.py` (`current_admin`), `pomiary_web/src/session/` |
| B1 / F4 walidacja przedziału i log odrzuceń | tak | 3:55 (formularz: 2:15) | `measurements/store.py`, `pomiary_generator/pomiary_generator/send.py`, `pomiary_web/src/series/validation.ts` |
| B1 / F5 filtrowanie po przedziale czasu i seriach | tak | 1:05 | `pomiary_web/src/dashboard/range.ts`, `Filters.tsx` |
| B1 / F6 wiersz tabeli wyróżnia punkt na wykresie | tak | 1:30 | `pomiary_web/src/dashboard/` |
| B1 / F7 wydruk wykresu z tabelą | tak | 5:10 | `pomiary_web/src/app.css`, `dashboard/dashboard.css` (`@media print`) |
| B1 / F8 administrator: logowanie, wylogowanie, zmiana hasła | tak | 1:45 | `pomiary_server/pomiary_server/auth/`, `pomiary_web/src/session/` |
| B1 / F9 UX: Enter, walidacja, ładowanie, błędy | tak | 1:45, 2:15 | `pomiary_web/src/session/`, `series/`, `sensors/` (`validation.ts`) |
| B1 / F10 responsywność od 360 px | tak | 4:50 | `pomiary_web/src/app.css`, `shell/` |
| B1 / F11 dane przykładowe (3+ serie, 15+ punktów) | tak | 0:20 | `pomiary_generator/pomiary_generator/seed.py` |
| B1 / F12 czujniki: rejestracja, jednorazowy klucz, lista, wyrejestrowanie | tak | 2:35, 4:25 | `pomiary_server/pomiary_server/sensors/`, `pomiary_web/src/sensors/` |
| B1 / F13 generator: adres, klucz, liczba/odstęp, tryb, przeszłość i bieżące | tak | 3:00 | `pomiary_generator/` (README) |
| B2 widok mobilny (ok. 360 px) i podgląd wydruku bez kontrolek | tak | 4:50 (mobilny), 5:10 (wydruk) | `pomiary_web/src/app.css`, e2e `shell/Shell.e2e.ts` |
| B3 dwa elementy T5 w nagraniu i w dokumentacji | tak | 5:20 | `docs/documentation.md` sekcja 5: (a) `sensors/store.py`, (b) `auth/store.py` |
| B4 diagram ERD i migracje w archiwum | tak | 6:25 (zawartość archiwum, ERD w PDF) | `docs/erd.svg`, `docs/erd.md`, `pomiary_server/pomiary_server/migrations/001_schema.sql`, `002_unique_names.sql` |
| B5 kompletna dokumentacja (PDF, do 8 stron) | tak | 6:25 (PDF, sekcje 1–9) | `docs/documentation.md`, budowana do `dokumentacja.pdf` przez `just package` |
| X1 wykres na żywo (SSE) | tak | 3:30 | `pomiary_server/pomiary_server/measurements/api.py` (stream), `pomiary_web/src/dashboard/live.ts` |
| X2 generator z rzeczywistymi danymi (Open-Meteo) | tak | 6:00 | `pomiary_generator/pomiary_generator/openmeteo.py` |
| X3 własne testy w CI, zielone | tak (link w formularzu) | 6:15 | `.github/workflows/ci.yml` |
| X4 baza szeregów czasowych | nie | n/d | niezrealizowane (klasyczny PostgreSQL) |

Pola formularza poza listą kontrolną: adres aplikacji (i adres API, ten sam host), testowe konto
administratora (podawane tylko w formularzu), link do repozytorium, link do CI.
