<!-- The source of formularz-e2.pdf, built by `just package --stage e2`. The admin login is filled in from
the platform's secrets file when the PDF is built; the repository keeps only the placeholders. -->

# Pomiary — warunki w lasach

<div class="doc-meta">

**Formularz zgłoszenia, etap E2**

| | |
| --- | --- |
| Autor | Piotr Gugnowski |
| Nr indeksu | 320690 |
| Przedmiot | Zaawansowane aplikacje internetowe (2026Z) |
| Data | {{DATA}} |

</div>

## Aplikacja

| | |
| --- | --- |
| Adres aplikacji | https://pomiary-lasy.gugnowski.com |
| Adres API | https://pomiary-lasy.gugnowski.com — ten sam host co aplikacja; ścieżki API, zgodnie z kontraktem, zaczynają się od `/api` |
| Dokumentacja API (Swagger UI) | https://pomiary-lasy.gugnowski.com/api/docs |

## Testowe konto administratora

| | |
| --- | --- |
| Nazwa użytkownika | `{{ADMIN_USERNAME}}` |
| Hasło | `{{ADMIN_PASSWORD}}` |

Konto działa do czasu wystawienia oceny.

## Repozytorium i CI

| | |
| --- | --- |
| Repozytorium | https://github.com/Manomenu/zaawansowane-aplikacje-internetowe-2026Z (gałąź `master`) |
| Status CI | https://github.com/Manomenu/zaawansowane-aplikacje-internetowe-2026Z/actions/workflows/ci.yml (GitHub Actions: bramka jakości, testy w przeglądarce, budowa obrazów) |

## Przesłane pliki

| Plik | Zawartość |
| --- | --- |
| `pomiary-zai-26z.zip` | kod źródłowy aplikacji i generatora danych, migracje SQL tworzące bazę, `.env.example` bez prawdziwych haseł, `dokumentacja.pdf` |
| `nagranie-e2.mp4` | nagranie demonstracyjne wdrożonej aplikacji |
| `lista-kontrolna-e2.pdf` | lista kontrolna: elementy B1–B5 i rozszerzenia z minutami nagrania |
| `formularz-e2.pdf` | ten formularz |
| `dokumentacja.pdf` | dokumentacja projektu (ta sama co w archiwum) |
