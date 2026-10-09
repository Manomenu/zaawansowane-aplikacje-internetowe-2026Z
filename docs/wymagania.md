# Macierz wymagań — ZAI 26Z „Serie pomiarowe”

Każde wymaganie ze specyfikacji (`docs/spec/zai-projekt-26z.pdf`) ma tu jeden wiersz. Bramka
(`just check`, krok „wymagania”, skrypt `scripts/.internal/wymagania.sh`) pilnuje, że:

- żaden kod wymagania nie zniknął z tabeli;
- status to jedno z: `todo`, `w toku`, `zrobione`;
- wiersz `zrobione` wskazuje w kolumnie „Dowód” istniejący plik `docs/progress/*.md`, a ten
  plik wymienia kod wymagania (opisuje, jak je spełniono i jak to sprawdzić).

Kolumna „Sprawdzane automatycznie” mówi, co w bramce lub w testach prowadzącego potwierdza
wymaganie; „ręcznie” znaczy, że dowodem jest nagranie lub lista kontrolna.

## Wymagania funkcjonalne

| Kod | Wymaganie | Status | Dowód | Sprawdzane automatycznie |
| --- | --- | --- | --- | --- |
| F1 | Wynik = liczba + znacznik czasu + seria; tylko z czujników przez API | todo | | |
| F2 | Seria: nazwa, min/max, kolor/ikona; kolumna w tabeli, krzywa na wykresie | todo | | |
| F3 | Role: czytelnik i administrator; nikt nie edytuje wyników w UI | todo | | |
| F4 | Walidacja zakresu na serwerze, w generatorze i w formularzach; log odrzuceń | todo | | |
| F5 | Filtrowanie: przedział czasu i widoczne serie | todo | | |
| F6 | Kliknięcie w tabeli wyróżnia punkt na wykresie | todo | | |
| F7 | Wydruk wykresu z tabelą bez kontrolek | todo | | |
| F8 | Konto administratora: logowanie, wylogowanie, zmiana hasła | todo | | |
| F9 | UX: Enter, walidacja przed wysłaniem, ładowanie, błędy serwera | todo | | |
| F10 | Responsywność od 360 px | todo | | |
| F11 | Dane przykładowe: ≥ 3 serie po ≥ 15 punktów, wprowadzone generatorem | todo | | |
| F12 | Czujniki: rejestracja, jednorazowy klucz, lista, wyrejestrowanie | todo | | |
| F13 | Generator: adres, klucz, liczba/odstęp, sposób generowania, przeszłość i bieżące | todo | | |

## Wymagania techniczne

| Kod | Wymaganie | Status | Dowód | Sprawdzane automatycznie |
| --- | --- | --- | --- | --- |
| T1 | Backend: Python (FastAPI) | zrobione | docs/progress/F0-inicjalizacja.md | pytest w bramce |
| T2 | Frontend SPA (React), Flexbox/Grid + media queries | w toku | docs/progress/F0-inicjalizacja.md | tsc, eslint, vitest w bramce |
| T3 | REST API zgodne z `zai-api-26z.yaml`, kontrakt niezmieniony | w toku | docs/progress/F0-inicjalizacja.md | sumy kontrolne `docs/spec/SHA256SUMS` w bramce |
| T4 | Relacyjna baza, klucze, ograniczenia, indeksy czasu, migracje SQL | w toku | docs/progress/F0-inicjalizacja.md | pytest na prawdziwym PostgreSQL |
| T5 | Bezpieczeństwo: bcrypt/Argon2id, zapytania parametryzowane, sesja/token, autoryzacja na serwerze, klucze czujników jako SHA-256 | todo | | |
| T6 | Dostępność WCAG 2.2 AA; seria nie tylko kolorem | todo | | |
| T7 | Wydruk przez `@media print` tego samego widoku | todo | | |
| T8 | Testy prowadzącego (`zai-tests.mjs`) przechodzą | todo | | |
| T9 | Repozytorium z czytelną historią przez cały projekt | w toku | docs/progress/F0-inicjalizacja.md | gitleaks w bramce |
| T10 | Publiczne wdrożenie (HTTPS) | todo | | |
| T11 | Generator w repo, przez API, klucz nie w kodzie, udokumentowany | todo | | |

## Punktacja automatyczna (testy prowadzącego)

| Kod | Co sprawdzają testy | Status | Dowód | Sprawdzane automatycznie |
| --- | --- | --- | --- | --- |
| A1 | E1: zgodność z kontraktem, czujniki, filtrowanie, F11 | todo | | |
| A2 | E2: ponownie zgodność z kontraktem | todo | | |
| A3 | Walidacja i autoryzacja (422, 400/422, 401, brak edycji wyników) | todo | | |
| A4 | HTTPS, nagłówki z CSP, flagi ciasteczek, brak sekretów w odpowiedziach | todo | | |
| A5 | Lighthouse Accessibility ≥ 90 | todo | | |

## Nagranie, lista kontrolna, archiwum

| Kod | Co musi być widoczne | Status | Dowód | Sprawdzane automatycznie |
| --- | --- | --- | --- | --- |
| B1 | F1–F13 w nagraniu | todo | | |
| B2 | Widok mobilny ~360 px i podgląd wydruku | todo | | |
| B3 | Dwa elementy T5 w nagraniu i dokumentacji | todo | | |
| B4 | Diagram ERD i migracje w archiwum | todo | | |
| B5 | Kompletna dokumentacja PDF | todo | | |

## Rozszerzenia (punkty dodatkowe)

| Kod | Rozszerzenie | Status | Dowód | Sprawdzane automatycznie |
| --- | --- | --- | --- | --- |
| X1 | Wykres na żywo (SSE / WebSocket) | todo | | |
| X2 | Generator z prawdziwymi danymi (Open-Meteo) | todo | | |
| X3 | Własne testy w CI z zielonym statusem | w toku | docs/progress/F0-inicjalizacja.md | `.github/workflows/ci.yml` uruchamia bramkę |
| X4 | Baza szeregów czasowych (TimescaleDB) | todo | | |
