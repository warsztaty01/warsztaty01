# 🕐 Redmine Time Logger - Interfejs Webowy

Webowa aplikacja do logowania czasu pracy w Redmine. Zastępuje starą aplikację desktopową (Tkinter).

## 📋 Funkcje

✅ Logowanie czasu pracy do Redmine  
✅ Zapisywanie ulubionych tasków  
✅ Wsparcie dla różnych rodzajów aktywności  
✅ Interfejs responsywny (mobile-friendly)  
✅ Dark mode inspirowany  

## 🚀 Instalacja i Uruchomienie

### 1. Zainstaluj zależności

```powershell
pip install -r requirements.txt
```

### 2. Uruchom aplikację

```powershell
python app.py
```

### 3. Otwórz przeglądarkę

Przejdź do: **http://localhost:5000**

## ⚙️ Konfiguracja

Edytuj plik `app.py` i zmień:

```python
REDMINE_URL = "https://redmine.summ-it.pl"      # Twój URL Redmine
API_KEY = "9a4a35513f0582a421563ca13c199237939b47d0"  # Twój API Key
```

## 📖 Użytkowanie

### Logowanie czasu

1. Wpisz Issue ID (ID zadania z Redmine)
2. Wpisz ilość godzin
3. Wybierz typ aktywności
4. Wybierz datę
5. (Opcjonalnie) Dodaj komentarz
6. Kliknij **Wyślij do Redmine**

### Zapisywanie tasków

1. Przejdź do karty **Moje Taski**
2. Wpisz Issue ID i opis taska
3. Kliknij **Zapisz Task**
4. Taski będą dostępne w liście rozwijalnej przy logowaniu czasu

## 🔄 Mapowanie Aktywności

| Aktywność | ID |
|-----------|-----|
| Communication | 11 |
| Education | 12 |
| Organization | 13 |
| Documentation | 14 |
| Management | 15 |
| Research | 16 |
| Development | 9 |
| Support | 10 |

## 📁 Struktura plików

```
.
├── app.py                 # Backend Flask
├── requirements.txt       # Zależności
├── tasks.json            # Zapisane taski (auto-generated)
└── templates/
    └── index.html        # Frontend HTML/CSS/JS
```

## 🛠️ Troubleshooting

### "SSL: CERTIFICATE_VERIFY_FAILED"
Aplikacja automatycznie ignoruje problemy SSL. Jeśli dalej są błędy, sprawdź certyfikat Redmine.

### Port 5000 już zajęty
Zmień port w ostatniej linii `app.py`:
```python
app.run(debug=True, host='localhost', port=5001)  # Zmień 5000 na 5001
```

### Brak połączenia z Redmine
- Sprawdź URL i API Key
- Upewnij się, że połączenie internetowe działa
- Sprawdź czy Redmine jest dostępny z przeglądarki

## 📝 Pliki konfiguracyjne

- `tasks.json` - automatycznie generowany, zawiera zapisane taski
- `app.py` - aplikacja główna (zmień tutaj konfigurację)

## 🔒 Bezpieczeństwo

⚠️ Nie commituj `app.py` z rzeczywistym API Key do repozytorium publicznego!

Zalecane: przechowaj API Key w zmiennej środowiskowej:

```powershell
$env:REDMINE_API_KEY = "twój_klucz"
```

Następnie w `app.py`:
```python
API_KEY = os.environ.get('REDMINE_API_KEY', '')
```

## 📞 Wsparcie

Jeśli potrzebujesz pomocy, sprawdź dokumentację Redmine API na:
https://www.redmine.org/projects/redmine/wiki/Rest_TimeEntries
