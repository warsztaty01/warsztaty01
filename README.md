## Hi there 👋

Prosty demo Bingo (single-page) w HTML/CSS/JS.

Zmieniono: plansza jest teraz pełna (bez pola "FREE" pośrodku) — wszystkie 25 pól są wypełniane wpisami z pliku.

Pliki utworzone:

- `index.html` — interfejs użytkownika
- `css/style.css` — nowoczesne style + animacja BINGO
- `js/game.js` — logika gry: wczytywanie wpisów z pliku `.txt`, generowanie losowej planszy 5x5 (pełna plansza), losowanie wpisów, autoskreślanie i wykrywanie BINGO
- `entries/sample.txt` — przykładowe wpisy

Jak używać lokalnie:

1. Najlepiej uruchomić prosty serwer HTTP (zalecane) z katalogu projektu, np. w PowerShell:

```powershell
pwsh -c "python -m http.server 8000"
```

2. Otwórz `http://localhost:8000/index.html` w przeglądarce. Aplikacja będzie automatycznie wczytywać `entries/sample.txt` i będzie odpytywać plik co kilka sekund — zmiany w pliku spowodują automatyczne przeładowanie planszy.
3. Jeśli otworzysz `index.html` przez `file://` i automatyczne wczytanie zawiedzie, w prawym dolnym rogu pojawi się niewielkie okienko pozwalające manualnie wskazać plik `.txt`.
4. Gdy zostanie pełny wiersz/kolumna/przekątna — pojawi się efekt "B I N G O".

Chcesz dodatkowe funkcje (druk, PDF, inne rozmiary planszy, tryb wieloosobowy)? Odpowiedz, a dodam.

Deployment to Azure Static Web Apps

1. Umieść repozytorium na GitHubie.
2. W Azure stwórz zasób Static Web App i połącz go z repozytorium (domyślnie utworzy GitHub Action, który będzie deployował zawartość katalogu root).
3. W repozytorium plik `staticwebapp.config.json` został dodany, aby nie przekierowywać zapytań do `/entries/*` — dzięki temu plik `entries/sample.txt` będzie dostępny bez rewrite.

Uwaga: jeśli chcesz, żebym dodał gotowy GitHub Action lub szczegółowy krok po kroku (z przykładami ustawień), daj znać.

## Hi there 👋

<!--
**warsztaty01/warsztaty01** is a ✨ _special_ ✨ repository because its `README.md` (this file) appears on your GitHub profile.

Here are some ideas to get you started:

- 🔭 I’m currently working on ...
- 🌱 I’m currently learning ...
- 👯 I’m looking to collaborate on ...
- 🤔 I’m looking for help with ...
- 💬 Ask me about ...
- 📫 How to reach me: ...
- 😄 Pronouns: ...
- ⚡ Fun fact: ...
-->
