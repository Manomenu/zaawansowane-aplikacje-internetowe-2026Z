# Skrypt nagrania - film E2 (cel 6:50, limit 7:00)

Specyfikacja (`docs/spec/zai-projekt-26z.pdf`, "Zawartość zgłoszenia końcowego (E2)"):
MP4 do 100 MB, od 5 do 7 minut, **wdrożona** aplikacja z **widocznym paskiem adresu**,
wymagania po kolei (F1-F13, widok mobilny, podgląd wydruku, dwa elementy bezpieczeństwa,
rozszerzenia), kod **powiedziany lub pokazany przed każdym wymaganiem** oraz pełny cykl
czujnika. Ten plik to plan; minuty w `docs/submissions/lista-kontrolna-e2.md` pochodzą z niego i są poprawiane po
nagraniu.

Język: skrypt jest po polsku; język lektora wybiera właściciel. Kod mów na głos w języku
lektora (na przykład po polsku "F szóste" albo "F6") **i** pokaż go na ekranie: duży plik
tekstowy lub karteczka z następnym kodem w rogu nagrania albo tytuł terminala.

## Przed nagraniem

- **Wdrożone i zasilone danymi.** `https://pomiary-lasy.gugnowski.com` odpowiada przez HTTPS,
  12 serii ma po 30 dni wyników co 6 h (`pomiary_generator seed`), logowanie administratora
  działa. Raz wcześniej uruchom `just lighthouse https://pomiary-lasy.gugnowski.com` (A5);
  nie wchodzi to do filmu.
- **Ekran:** jedno nagranie 1920×1080. Przeglądarka po lewej, dwie trzecie szerokości (pasek
  adresu widoczny cały czas, zoom 100 %), terminal po prawej, jedna trzecia (czcionka
  16-18 pt). Nie używaj trybu pełnoekranowego przeglądarki: ukrywa pasek adresu.
- **Profil przeglądarki:** czysty (bez rozszerzeń, bez paska zakładek), jasny motyw,
  **wylogowany** (pusty `sessionStorage`). Dodatkowe karty, gotowe: strona CI
  (`https://github.com/Manomenu/zaawansowane-aplikacje-internetowe-2026Z/actions/workflows/ci.yml`),
  plik na GitHubie `pomiary_server/pomiary_server/sensors/store.py` oraz `auth/store.py`.
  Devtools zamknięte.
- **Terminal:** w `pomiary_generator/` (albo w katalogu głównym repozytorium z `uv run`),
  z ustawionym adresem API, żeby na ekranie nie wpisywać nic tajnego:

  ```sh
  export POMIARY_API=https://pomiary-lasy.gugnowski.com
  unset POMIARY_API_KEY
  clear
  ```

  Klucz wklejasz do terminala z okna dialogowego aplikacji webowej w trakcie nagrania
  (`export POMIARY_API_KEY=<paste>`); należy do tymczasowego czujnika usuwanego w tym samym
  nagraniu.
- **Gdzie widać log odrzucenia (F4).** Serwer loguje każdy odrzucony wynik jako `WARNING`
  (`measurements/store.py`: "measurement rejected: sensor ..., value ..."). Na klastrze ten
  log pokazuje **k9s**; przygotuj drugi panel terminala (aplikacja Argo to `pomiary`, więc
  chart nazywa deployment `pomiary-server` w przestrzeni nazw `pomiary`):
  `k9s --kubeconfig ~/repos/suwalski-platform/kubeconfig -n pomiary -c deploy`, potem wybierz
  `pomiary-server`, naciśnij `l` (logi) i wpisz `/measurement rejected` + Enter, żeby
  filtrować; `Esc` wraca. Przećwicz raz po wdrożeniu: po odrzuceniu musi pojawić się linia.
  Przed nagraniem powiększ czcionkę terminala, żeby linia była czytelna na filmie.
  Plan awaryjny, jeśli klaster nie jest pokazywany na nagraniu: linia `REJECTED 422` z
  generatora danych plus odpowiedź w Swaggerze i jedno zdanie, że odrzucenie jest logowane
  (mówi o tym dokumentacja).
- **B4/B5:** uruchom `just package` przed nagraniem, tym samym buildem, który jest
  zgłaszany, i otwórz `.artifacts/submissions/e2/dokumentacja.pdf` w karcie przeglądarki na
  sekcji 4.
- **Przećwicz raz** ze stoperem. Uzupełnienie 24 wyników zajmuje sekundę lub dwie; uruchomienie
  na żywo `--count 8 --interval 3s` trwa 24 s.
- Wyeksportuj MP4 (H.264) i sprawdź rozmiar (`ls -lh`, poniżej 100 MB; 1080p przy około
  3 Mbit/s to około 150 MB na godzinę, więc 7 minut to około 20 MB).

## Plan czasowy

| Start | Czas | Kod(y) | Co pokazać i powiedzieć |
| --- | --- | --- | --- |
| 0:00 | 0:20 | n/a | Pasek adresu i aplikacja, wylogowany. "Pomiary, ZAI 26Z, wdrożona aplikacja pod pomiary-lasy.gugnowski.com, kod na GitHubie." Powiedz, co będzie dalej. |
| 0:20 | 0:15 | **F11** | Zakładka Data: przykładowe dane wczytane przez generator danych. Pokaż co najmniej trzy serie z wyraźnie ponad 15 punktami każda (wszystkie 12: 3 miejsca × 4 wielkości, 30 dni, wynik co 6 h: po 120 na serię). |
| 0:35 | 0:15 | **F2** | Jedna kolumna na serię w tabeli, jedna krzywa na serię na wykresie, kolor **i** kształt znacznika (serii nie rozróżnia się samym kolorem, T6). |
| 0:50 | 0:15 | **F3** | Nadal wylogowany: rola czytelnika. Brak zakładek administratora, brak możliwości edycji wyniku. Powiedz: "nikt nie edytuje wyników w interfejsie". |
| 1:05 | 0:25 | **F5** | Filtry: preset (24 h), własny zakres From/To, odznacz jedną serię (jej krzywa i kolumna znikają), zaznacz ją z powrotem. |
| 1:30 | 0:15 | **F6** | Kliknij wiersz tabeli: punkt jest podświetlony na wykresie (Enter działa też z klawiatury). |
| 1:45 | 0:30 | **F8**, **F9** | Zaloguj się: najpierw złe hasło (błąd serwera pod formularzem), potem właściwe z **Enter**, ze stanem ładowania na przycisku. Zakładka Account: zmień hasło (najpierw błąd walidacji, potem poprawna zmiana na to samo hasło, żeby hasło sprawdzane przez prowadzącego pozostało bez zmian), wyloguj się i zaloguj ponownie. |
| 2:15 | 0:20 | **F2**, **F4** (form) | Zakładka Series: utwórz "Demo temperature", jednostka °C, zakres 0-100, kolor i znacznik. Najpierw min 100 i max 0: formularz odmawia przed wysłaniem (F4 w formularzu), potem poprawne wartości. Seria się pojawia. |
| 2:35 | 0:25 | **F12** | Zakładka Sensors, "Register a sensor": nazwa "Demo sensor", seria "Demo temperature". Okno "Sensor registered" pokazuje klucz **tylko raz**: skopiuj go. W terminalu: `export POMIARY_API_KEY=<paste>` (czujnik jest usuwany o 4:25). |
| 3:00 | 0:30 | **F13**, **F1** | Terminal: polecenie uzupełnienia danych (poniżej), 24 linie `201 ...`. Przeglądarka, zakładka Data, zaznaczone "Demo temperature", filtr 24 h: 24 punkty są na wykresie i w tabeli. Powiedz o F1: wynik to liczba, czas i seria, i pochodzi wyłącznie z czujnika przez API. |
| 3:30 | 0:25 | **X1** | Wykres widoczny obok terminala, preset **15 min** (oś obejmuje wtedy ostatnie minuty, więc nowe punkty są dość szeroko rozstawione, by je zobaczyć). Polecenie na żywo: nowy punkt pojawia się co sekundę **bez przeładowania strony** (strumień SSE na żywo), pełna fala w górę i w dół co 20 s. |
| 3:55 | 0:30 | **F4** | Polecenie z wartością spoza zakresu: `REJECTED 422: value 120 is outside the series range [0, 100]`. Potem panel z logiem serwera: linia WARNING `measurement rejected`. Wykres bez zmian. |
| 4:25 | 0:25 | **F12** | Zakładka Sensors: "Unregister Demo sensor", potwierdź; wiersz znika. Terminal, ten sam klucz, ostatnie polecenie poniżej: **401**, uruchomienie się zatrzymuje, wyrejestrowany czujnik zostaje odrzucony. (Stare wyniki zostają; usuń "Demo temperature" potem, poza kadrem lub szybko.) |
| 4:50 | 0:20 | **B2** (mobile) | Pasek urządzeń w devtools, szerokość **360 px**: nagłówek i zakładki, zwinięte filtry, wykres i tabela bez przewijania w poziomie, potem zakładka Sensors lub Series (listy ułożone w stos). Zamknij pasek. |
| 5:10 | 0:10 | **B2** (print), **F7** | Ctrl+P: podgląd wydruku pokazuje wykres i tabelę oraz **brak elementów sterujących** (filtry, zakładki, przyciski ukryte). Anuluj. |
| 5:20 | 0:40 | **B3** (T5) | Dwa elementy. (a) **Klucze API czujników** (T5.5): klucz był pokazany tylko raz w oknie (2:35); `GET /api/sensors` nie zwraca klucza (Swagger pod `/api/docs` albo karta Network); karta z kodem `sensors/store.py`: `create_sensor` generuje `token_urlsafe(32)` i zapisuje tylko `key_hash`, czyli SHA-256 (`api_key_hash UNIQUE`). Opcjonalnie, tylko jeśli przećwiczone: `psql` na produkcyjnej bazie, `SELECT name, left(api_key_hash, 16) FROM sensors;` pokazuje hashe, a nie klucze; w przeciwnym razie pokaż kod i `001_schema.sql` (wdrożona baza jest w klastrze, nic nieprzećwiczonego się na niej nie uruchamia). (b) **Hasła Argon2id i wygasające nieprzejrzyste tokeny sesji** (T5.1, T5.3): karta z kodem `auth/store.py`: `hasher`, `open_session` (`token_hash`, `expires_at`), `UNKNOWN_USER_HASH`; odpowiedź logowania zawiera `expiresIn`. Powiedz, przed czym każdy element chroni: przed kopią skradzionej bazy; przed odtworzeniem tokenu. |
| 6:00 | 0:15 | **X2** | Terminal: polecenie Open-Meteo (poniżej), z kluczem czujnika serii (klucz czujnika z danych początkowych albo krótkotrwałego czujnika zarejestrowanego przed nagraniem). Linie `201 ...` z prawdziwymi aktualnymi wartościami. Powiedz: "prawdziwe dane z Open-Meteo, CC BY 4.0, atrybucja w dokumentacji". Kod: `pomiary_generator/pomiary_generator/openmeteo.py`. |
| 6:15 | 0:10 | **X3** | Strona GitHub Actions: zielony status ostatniego przebiegu na `master` (zadania `test`, `e2e`, `build`). |
| 6:25 | 0:15 | **B4**, **B5** | Terminal: lista zawartości archiwum (poniżej) pokazuje `docs/erd.svg`, obie migracje `migrations/001_schema.sql` i `002_unique_names.sql` oraz `dokumentacja.pdf` w ZIP-ie (B4). Potem PDF, już otwarty: sekcja 4 z diagramem ERD i szybkie przewinięcie nagłówków sekcji 1-9 (B5: adres, logowanie, uruchomienie lokalne i generator danych, ERD, bezpieczeństwo, rozszerzenia API, AI, technologie, rozszerzenia). |
| 6:40 | 0:10 | n/a | Jedno zdanie na zakończenie: archiwum i dokumentacja są w zgłoszeniu; X4 nie jest zgłaszane. Stop. |

Razem 6:50, 10 s zapasu. Jeśli nagranie się wydłuża, skracaj najpierw F5 i X2, nigdy pełnego
cyklu czujnika (2:35-4:50) ani B4/B5 (ich minuta trafia do listy kontrolnej).

## Pełny cykl czujnika (wszystkie pięć kroków jest w nagraniu)

1. zarejestruj czujnik w aplikacji: 2:35 (F12);
2. wstaw jego klucz do generatora danych: 2:35-3:00 (`POMIARY_API_KEY`);
3. wyślij wyniki i zobacz je na wykresie: 3:00 i 3:30 (F13, F1, X1);
4. wynik spoza zakresu zostaje odrzucony: 3:55 (F4: komunikat generatora i log serwera);
5. wyrejestruj czujnik, a następna wysyłka z generatora zostaje odrzucona z 401: 4:25 (F12).

## Polecenia do wklejenia (po kolei)

```sh
export POMIARY_API=https://pomiary-lasy.gugnowski.com
export POMIARY_API_KEY=<paste the key from the dialog>

# 3:00 uzupełnienie danych, 24 wyniki co godzinę
python -m pomiary_generator send --count 24 --step 1h --shape sine --min 20 --max 80 --noise 2 --seed 1
# 3:30 na żywo, jeden wynik na sekundę; okres sinusa 20 s (od maksimum do minimum w 10 s), więc 25 s pokazuje więcej niż pełną falę
python -m pomiary_generator send --interval 1s --count 25 --shape sine --min 10 --max 90 --period 20s
# 3:55 poza zakresem (seria dopuszcza 0..100)
python -m pomiary_generator send --count 1 --shape constant --min 120 --max 120
# 4:25 po wyrejestrowaniu w aplikacji: 401
python -m pomiary_generator send --count 1 --shape constant --min 50 --max 50
# 6:00 X2, prawdziwe dane (POMIARY_API_KEY ustawiony na klucz czujnika serii)
python -m pomiary_generator send --source open-meteo --place warsaw --quantity air-temperature --count 6
# 6:25 B4/B5, z katalogu głównego repozytorium: co zawiera archiwum
unzip -l .artifacts/submissions/e2/pomiary-zai-26z.zip | grep -E 'erd|migrations/|dokumentacja'
```

## Po nagraniu

Wpisz prawdziwe minuty do `docs/submissions/lista-kontrolna-e2.md`. Sprawdź, czy każdy kod został powiedziany lub
pokazany **przed** swoim fragmentem, czy pasek adresu nigdy nie był ukryty, długość
(5:00-7:00) i rozmiar pliku. Usuń serię "Demo temperature" i czujniki demonstracyjne z
wdrożonej aplikacji, jeśli nadal tam są.
