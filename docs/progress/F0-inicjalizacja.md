# F0 — inicjalizacja repozytorium z szablonu

Data: 2026-10-09. Etap projektu: przed E1 (termin E1: 7.11.2026).

## Co spełniono

| Kod | Zakres |
| --- | --- |
| T1 | **Spełnione.** Backend w Pythonie: FastAPI (`pomiary_server/`), uruchamiany `just server`, testowany pytestem na prawdziwym PostgreSQL. |
| T2 | **Częściowo.** Szkielet SPA w React 19 + Vite + Mantine (`pomiary_web/`), ze ścisłym TypeScriptem, eslintem i vitestem. Widoków aplikacji jeszcze nie ma. |
| T3 | **Częściowo.** Kontrakt `docs/spec/zai-api-26z.yaml` jest w repo i jest chroniony sumą kontrolną (`docs/spec/SHA256SUMS`): jego zmiana zatrzymuje bramkę. Endpointów jeszcze nie ma. |
| T4 | **Częściowo.** PostgreSQL 17 lokalnie (`just db up`), w CI i w `just up`. Numerowane migracje SQL z sumami kontrolnymi (`pomiary_server/pomiary_server/migrations/`, `db.py`). Schematu dziedziny jeszcze nie ma. |
| T9 | **W toku przez cały projekt.** Repozytorium `github.com/Manomenu/zaawansowane-aplikacje-internetowe-2026Z`, gałąź `master`. Commity robi `suwgit push` po każdym skończonym kawałku pracy, a opis commita pisze lokalny LLM. gitleaks sprawdza całą historię. |
| X3 | **Częściowo.** `.github/workflows/ci.yml` uruchamia na każdym pushu tę samą bramkę co `just check`, a do tego testy przeglądarkowe. Zielony status pojawi się po pierwszym pushu. |

## Co zrobiono

- Skopiowano szablon `solid-app-tpl` (FastAPI + React + PostgreSQL + Helm + compose + CI) i
  uruchomiono `scripts/init-project.sh pomiary 2`. Nazwy `myapp` zamieniono na `pomiary`.
  Porty mają przesunięcie 2, żeby nie kolidować z automat-operat (0) i grzyby-mcp (1):
  serwer 6220, web 3220, baza 5453, stos kontenerów 8092.
- Pliki od prowadzącego przeniesiono do `docs/spec/` (`zai-projekt-26z.pdf`, `zai-api-26z.yaml`,
  `zai-tests.mjs`) i zapisano ich sumy SHA-256 w `docs/spec/SHA256SUMS`.
- Dodano macierz wymagań `docs/wymagania.md`: każdy kod F1–F13, T1–T11, A1–A5, B1–B5 i
  rozszerzenia X1–X4 ma wiersz ze statusem i dowodem.
- Dodano krok bramki `requirements` (`scripts/.internal/wymagania.sh`, uruchamiany jako
  pierwszy w `scripts/.internal/check.sh`, czyli w `just check` i w CI). Sprawdza:
  1. czy pliki w `docs/spec/` są niezmienione;
  2. czy każdy kod wymagania ma wiersz z poprawnym statusem;
  3. czy wiersz `zrobione` wskazuje istniejący plik postępu, który wymienia ten kod;
  4. czy każdy plik `docs/progress/F*.md` ma sekcje „Co spełniono”, „Co zrobiono”,
     „Dlaczego tak” i „Jak sprawdzić”.
- W `AGENTS.md` opisano trzy odstępstwa od szablonu wymuszone przez kurs:
  - commity tylko przez `suwgit push`;
  - własne logowanie administratora i klucze czujników zamiast Cloudflare Access, bo testy
    prowadzącego wchodzą na publiczny adres bez Access;
  - sekcja „Course requirements” z zasadami prowadzenia macierzy i plików postępu.
- Dodano `.gitleaks.toml`: domyślne reguły gitleaks plus zwolnienie dokładnie jednego pliku,
  `docs/spec/zai-tests.mjs`. Skrypt prowadzącego zawiera celowo sfałszowany token JWT
  (`alg: none`, test „Sfałszowany token: 401”) i przykładowe hasło, a hook pre-commit
  odrzucał przez nie commit. Pliku nie wolno zmienić, więc zwolnienie nie otwiera furtki:
  suma kontrolna wykryje każdą zmianę jego treści.
- Ustawiono rejestr obrazów w `deploy/chart/values.yaml`
  (`ghcr.io/manomenu/zaawansowane-aplikacje-internetowe-2026z`, tak jak publikuje go CI).
  Adres publiczny ma być `pomiary-lasy.gugnowski.com`, ustawi go repo platformy.

## Dlaczego tak

- **Szablon zamiast pisania od zera.** Bramka jakości, CI, obrazy, Helm i testy e2e są gotowe
  i sprawdzone w innych projektach, więc czas idzie na wymagania kursu.
- **FastAPI (T1).** Pydantic daje walidację wejścia: 422 przy złym typie albo brakującym polu.
  Do tego automatyczny OpenAPI, z którego frontend generuje typy (`just api-types`).
  Alternatywy (Express/NestJS, Spring) odpadły, bo cały ekosystem właściciela jest w Pythonie.
- **PostgreSQL z czystym SQL i numerowanymi migracjami (T4).** Specyfikacja wymaga „skryptu SQL
  lub migracji”, a pliki `NNN_*.sql` są jednocześnie migracjami i skryptem do archiwum (B4).
  PostgreSQL ma też rozszerzenie TimescaleDB, czyli drogę do rozszerzenia X4 bez zmiany bazy.
- **Pliki od prowadzącego zablokowane sumą kontrolną.** Kontraktu nie wolno zmieniać (T3), a
  skrypt testów to podstawa oceny. Przypadkowa edycja (formatowanie, „poprawka”) ma zatrzymać
  bramkę, zanim trafi do oceny.
- **Macierz wymagań sprawdzana przez bramkę, a nie lista w notatce.** Status „zrobione” bez
  dowodu nie przejdzie CI, więc lista kontrolna do E2 powstaje na bieżąco i nie da się jej
  rozjechać z rzeczywistością. Za rozjazd przy weryfikacji wyrywkowej jest −5 pkt.
- **Dziedzina: warunki w lesie dla grzyby-mcp.** Serie (opad, temperatura, wilgotność gleby w
  kilku lokalizacjach) mają naturalne przedziały min/max (F2, F4). Generator może czytać
  prawdziwe dane z Open-Meteo (X2): darmowo niekomercyjnie, < 10 tys. zapytań dziennie, a
  potrzebujemy kilkudziesięciu. Aplikacja nie zależy od Open-Meteo w czasie działania.
- **Pominięto na tym etapie:** schemat bazy, endpointy, uruchamianie `zai-tests.mjs` w bramce.
  Wejdą razem z pierwszym kodem, który ich potrzebuje (KISS, AGENTS.md sekcja 0).

## Jak sprawdzić

```sh
just check                                  # cała bramka; pierwszy krok to "requirements"
./scripts/.internal/wymagania.sh            # sam krok wymagań
(cd docs/spec && sha256sum --check SHA256SUMS)
```

Wynik `just check` z 9.10.2026: wszystkie kroki PASS (requirements, ruff, pyright, import-linter,
pytest, tsc, eslint, prettier, vitest, knip, typy API, helm, shellcheck, gitleaks, compose).

Kontrola negatywna: dopisanie znaku do `docs/spec/zai-api-26z.yaml` albo ustawienie
`zrobione` bez dowodu w `docs/wymagania.md` daje `FAIL requirements`.
