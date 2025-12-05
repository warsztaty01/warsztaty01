# Brick Breaker (Arkanoid) — HTML5 Canvas

Prosty klon Brick Breaker / Arkanoid stworzony w HTML5 Canvas + JavaScript.

Pliki:
- `index.html` — strona uruchamiająca grę
- `style.css` — proste style i paleta kolorów
- `js/game.js` — pełna logika gry (poziomy, mechanika, power-upy, dźwięk)

Jak uruchomić:

1. Otwórz `index.html` w nowoczesnej przeglądarce (Chrome, Edge, Firefox).
   - Najprościej: dwuklik pliku lub `Ctrl+O` w przeglądarce i wskaż plik.
2. Sterowanie:
   - Mysz: porusz platformą
   - Klawisze: `ArrowLeft` / `ArrowRight` aby ruszać
   - `Space`: rozpocznij / wznow

Mechanika i edycja poziomów:
- Poziomy zdefiniowane są w `js/game.js` w tablicy `levels`.
- Każda komórka ma wartość: `0` = puste, `1` = cegła jednorazowa, `2` = cegła wymagająca 2 trafień.
- Możesz dodać/zmienić poziomy, dopasowując szerokość i liczbę kolumn do `BRICK.width` + padding.

Funkcje zaimplementowane:
- Kolizje piłka-cegła, piłka-platforma, piłka-ściany
- Cegły znikają po trafieniu; silniejsze cegły wymagają dwóch trafień
- Piłka przyspiesza stopniowo po trafieniach
- Power-upy spadają rzadko: `expand` (większa platforma), `multiball`, `life`
- Proste efekty dźwiękowe generowane przez WebAudio
- Licznik punktów, żyć i poziomów

Plany / rozszerzenia (opcjonalne):
- Zapisać rekordy w localStorage
- Dodać menu poziomów i wybór trudności
- Dodać grafiki / animacje cząsteczkowe przy zniszczeniu cegieł

Kod jest skomentowany i gotowy do edycji — dobrą zabawę! 🎮
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
