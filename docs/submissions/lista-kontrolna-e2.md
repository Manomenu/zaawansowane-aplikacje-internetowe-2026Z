<!-- The source of lista-kontrolna-e2.pdf, built by `just package --stage e2`. The minutes are the start of
each scene in the recording: plan them from the owner's recording script (outside the repo), then set the real ones after the take. -->

# Pomiary - warunki w lasach

<div class="doc-meta">

**Lista kontrolna, etap E2**

| | |
| --- | --- |
| Autor | Piotr Gugnowski |
| Nr indeksu | 320690 |
| Przedmiot | Zaawansowane aplikacje internetowe (2026Z) |
| Data | {{DATA}} |

</div>

Deklaracja realizacji elementów części B i rozszerzeń, z minutą nagrania demonstracyjnego, od której dany
element jest widoczny. Kody wymagań są powiedziane i pokazane w nagraniu przed każdą sceną.

<div class="checklist">

| Element | Realizacja | Minuta nagrania | Gdzie w repozytorium |
| --- | --- | --- | --- |
| B1 / F1 wynik = liczba + czas + seria, tylko od czujników | tak | 1:55 | `pomiary_server/pomiary_server/measurements/` (żadna ścieżka nie edytuje wyniku) |
| B1 / F2 serie: przedział, kolor/ikona, kolumna i krzywa | tak | 0:00, 1:05 | `pomiary_web/src/series/`, `pomiary_web/src/dashboard/` |
| B1 / F3 role: czytelnik i administrator | tak | 0:00, 3:45 | `pomiary_server/pomiary_server/auth/api.py` (`current_admin`), `pomiary_web/src/session/` |
| B1 / F4 walidacja przedziału i log odrzuceń | tak | 3:00, 3:45 (formularz: 1:05) | `measurements/store.py`, `pomiary_generator/pomiary_generator/send.py`, `pomiary_web/src/series/validation.ts` |
| B1 / F5 filtrowanie po przedziale czasu i seriach | tak | 0:25 | `pomiary_web/src/dashboard/range.ts`, `Filters.tsx` |
| B1 / F6 wiersz tabeli wyróżnia punkt na wykresie | tak | 0:25 | `pomiary_web/src/dashboard/` |
| B1 / F7 wydruk wykresu z tabelą | tak | 4:55 | `pomiary_web/src/app.css`, `dashboard/dashboard.css` (`@media print`) |
| B1 / F8 administrator: logowanie, wylogowanie, zmiana hasła | tak | 0:45, 4:10 | `pomiary_server/pomiary_server/auth/`, `pomiary_web/src/session/` |
| B1 / F9 UX: Enter, walidacja, ładowanie, błędy | tak | 0:45, 1:05 | `pomiary_web/src/session/`, `series/`, `sensors/` (`validation.ts`) |
| B1 / F10 responsywność od 360 px | tak | 4:30 | `pomiary_web/src/app.css`, `shell/` |
| B1 / F11 dane przykładowe (3+ serie, 15+ punktów) | tak | 0:00 | `pomiary_generator/pomiary_generator/seed.py` |
| B1 / F12 czujniki: rejestracja, jednorazowy klucz, lista, wyrejestrowanie | tak | 1:30, 3:25 | `pomiary_server/pomiary_server/sensors/`, `pomiary_web/src/sensors/` |
| B1 / F13 generator: adres, klucz, liczba/odstęp, tryb, przeszłość i bieżące | tak | 1:55 | `pomiary_generator/` (README) |
| B2 widok mobilny (ok. 360 px) i podgląd wydruku bez kontrolek | tak | 4:30 (mobilny), 4:55 (wydruk) | `pomiary_web/src/app.css`, e2e `shell/Shell.e2e.ts` |
| B3 dwa elementy T5 w nagraniu i w dokumentacji | tak | 5:05 | `docs/documentation.md` sekcja 5: (a) `sensors/store.py`, (b) `auth/store.py` |
| B4 diagram ERD i migracje w archiwum | tak | 5:35 (zawartość archiwum, ERD w PDF) | `docs/erd.svg`, `docs/erd.md`, `pomiary_server/pomiary_server/migrations/001_schema.sql`, `002_unique_names.sql` |
| B5 kompletna dokumentacja (PDF, do 8 stron) | tak | 5:35 (PDF) | `docs/documentation.md`, w archiwum jako `dokumentacja.pdf` |
| X1 wykres na żywo (SSE) | tak | 2:20 | `pomiary_server/pomiary_server/measurements/api.py` (stream), `pomiary_web/src/dashboard/live.ts` |
| X2 generator z rzeczywistymi danymi (Open-Meteo) | tak | 2:50 | `pomiary_generator/pomiary_generator/openmeteo.py` |
| X3 własne testy w CI, zielone | tak (link w formularzu zgłoszenia) | 5:50 | `.github/workflows/ci.yml` |
| X4 baza szeregów czasowych | nie | n/d | niezrealizowane (klasyczny PostgreSQL) |

</div>
