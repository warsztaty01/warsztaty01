from flask import Flask, render_template, request, jsonify
import requests
from datetime import datetime, date
import json
import os
from pathlib import Path

app = Flask(__name__)

# 🔧 Konfiguracja
REDMINE_URL = "https://redmine.summ-it.pl"
API_KEY = "9a4a35513f0582a421563ca13c199237939b47d0"

ACTIVITIES = {
    "Communication": 11,
    "Education": 12,
    "Organization": 13,
    "Documentation": 14,
    "Management": 15,
    "Research": 16,
    "Development": 9,
    "Support": 10
}

TASKS_FILE = Path("tasks.json")

# -------------------- Helpers --------------------
def load_tasks():
    if TASKS_FILE.exists():
        with open(TASKS_FILE, "r") as f:
            return json.load(f)
    return {}

def save_tasks(tasks):
    with open(TASKS_FILE, "w") as f:
        json.dump(tasks, f, indent=2)

# -------------------- Routes --------------------
@app.route('/')
def index():
    tasks = load_tasks()
    return render_template('index.html', activities=ACTIVITIES, saved_tasks=tasks)

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    tasks = load_tasks()
    return jsonify(tasks)

@app.route('/api/tasks', methods=['POST'])
def save_task():
    data = request.json
    task_id = str(data.get('task_id'))
    task_desc = data.get('task_desc')
    
    if not task_id or not task_desc:
        return jsonify({'error': 'Task ID i opis są wymagane'}), 400
    
    tasks = load_tasks()
    tasks[task_id] = task_desc
    save_tasks(tasks)
    
    return jsonify({'message': f'Task {task_id} zapisany', 'tasks': tasks}), 201

@app.route('/api/time-entries', methods=['POST'])
def send_time_entry():
    data = request.json
    
    try:
        issue_id = int(data.get('issue_id'))
        hours = float(data.get('hours'))
        comments = data.get('comments', '')
        activity_id = int(data.get('activity_id'))
        spent_on = data.get('spent_on')
    except (ValueError, TypeError):
        return jsonify({'error': 'Nieprawidłowe dane'}), 400
    
    url = f"{REDMINE_URL}/time_entries.json"
    headers = {
        "Content-Type": "application/json",
        "X-Redmine-API-Key": API_KEY
    }
    
    payload = {
        "time_entry": {
            "issue_id": issue_id,
            "hours": hours,
            "comments": comments,
            "activity_id": activity_id,
            "spent_on": spent_on
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, verify=False)
        if response.status_code == 201:
            return jsonify({'message': 'Czas został zalogowany ✅'}), 201
        else:
            return jsonify({
                'error': f'Błąd Redmine (Status {response.status_code})',
                'details': response.text
            }), response.status_code
    except Exception as e:
        return jsonify({'error': f'Błąd połączenia: {str(e)}'}), 500

@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    tasks = load_tasks()
    if task_id in tasks:
        del tasks[task_id]
        save_tasks(tasks)
        return jsonify({'message': 'Task usunięty'}), 200
    return jsonify({'error': 'Task nie znaleziony'}), 404

if __name__ == '__main__':
    # Wygeneruj ostrzeżenie SSL
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    print("🚀 Aplikacja uruchamia się na http://localhost:5000")
    app.run(debug=True, host='localhost', port=5000)
