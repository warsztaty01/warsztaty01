# Koło Fortuny — projekty (Azure Static Web App)

Prosta strona statyczna napisana w czystym JavaScript, przygotowana do wdrożenia jako Azure Static Web App.

Co w repozytorium:
- `index.html` — główna strona z kołem fortuny.
- `assets/style.css` — style.
- `assets/script.js` — logika koła i losowania.
- `staticwebapp.config.json` — minimalna konfiguracja dla Azure Static Web Apps (nawigacja do index).

Projekty umieszczone w kole (przykładowe):
1. Todo App — prosta lista zadań (CRUD, localStorage).
2. Weather App — pobieranie pogody z API i wizualizacja.
3. Chat Room — prosty chat czasu rzeczywistego (Socket/long-polling).
4. Portfolio — responsywne portfolio z projektami.
5. Blog CMS — prosty blog z obsługą markdown.

Jak testować lokalnie
1. Najprościej: otwórz `index.html` w przeglądarce (double-click). Niektóre przeglądarki blokują moduły/zasoby jeśli serwujesz z plików; jeśli widzisz problemy, uruchom prosty serwer:

	Powershell (Windows):

	```powershell
	# z katalogu repo
	python -m http.server 8000
	# lub, jeśli masz node:
	npx http-server -p 8000
	```

2. Otwórz http://localhost:8000 w przeglądarce.

Wdrożenie do Azure Static Web Apps
1. Możesz użyć Azure Portal -> Static Web Apps i wskazać repozytorium GitHub. Ustaw `App location` na `/` i `Output location` na pusty (dla prostego statycznego HTML) lub pozostaw domyślne jeśli używasz narzędzi budujących.
2. Alternatywnie zainstaluj Static Web Apps CLI lokalnie i przetestuj:

	```powershell
	npm install -g @azure/static-web-apps-cli
	npx swa start http://localhost:8000 --app-location .
	```

Uwagi i następne kroki
- Możemy dodać plik workflow GitHub Actions do automatycznego wdrożenia.
- Mogę rozbudować UI, dodać dźwięki, więcej opcji losowania lub integrację z Azure Functions.

Masz ochotę, żebym dodał automatyczne wdrożenie (GitHub Actions) i przykład `swa` workflow?
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
