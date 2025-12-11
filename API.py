import customtkinter as ctk
import requests
from tkcalendar import DateEntry
from tkinter import messagebox
from datetime import date
import json
import os

# 🔧 Konfiguracja (ustaw swoje wartości)
REDMINE_URL = "https://redmine.summ-it.pl"   # np. https://redmine.mojafirma.pl
API_KEY = "9a4a35513f0582a421563ca13c199237939b47d0"

# 🔹 Mapowanie Activity
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


TASKS_FILE = "tasks.json"

# -------------------- LOGIKA --------------------p
def load_tasks():
    if os.path.exists(TASKS_FILE):
        with open(TASKS_FILE, "r") as f:
            return json.load(f)
    return {}

def save_tasks():
    with open(TASKS_FILE, "w") as f:
        json.dump(saved_tasks, f, indent=2)

def send_time_entry():
    try:
        issue_id = int(entry_issue.get())
        hours = float(entry_hours.get())
        comments = entry_comments.get()
        activity_name = combo_activity.get()
        if activity_name not in ACTIVITIES:
            messagebox.showerror("Błąd", "Wybierz aktywność z listy")
            return
        activity_id = ACTIVITIES[activity_name]
        spent_on = entry_spent_on.get_date().strftime("%Y-%m-%d")
    except ValueError:
        messagebox.showerror("Błąd", "Issue ID i Hours muszą być liczbami")
        return

    url = f"{REDMINE_URL}/time_entries.json"
    headers = {"Content-Type": "application/json", "X-Redmine-API-Key": API_KEY}
    data = {"time_entry": {
        "issue_id": issue_id,
        "hours": hours,
        "comments": comments,
        "activity_id": activity_id,
        "spent_on": spent_on
    }}

    try:
        response = requests.post(url, json=data, headers=headers, verify=False)
        if response.status_code == 201:
            messagebox.showinfo("Sukces ✅", "Czas został zalogowany 🎉")
        else:
            messagebox.showerror("Błąd ❌", f"Status: {response.status_code}\n{response.text}")
    except Exception as e:
        messagebox.showerror("Błąd połączenia", str(e))

def save_task_action():
    try:
        task_id = str(int(entry_issue.get()))
        task_desc = entry_task_desc.get()
        if not task_desc:
            messagebox.showerror("Błąd", "Musisz podać opis taska")
            return
        saved_tasks[task_id] = task_desc
        save_tasks()
        update_task_dropdown()
        messagebox.showinfo("Sukces ✅", f"Zapisano task {task_id}: {task_desc}")
    except ValueError:
        messagebox.showerror("Błąd", "Issue ID musi być liczbą")

def load_selected_task(choice):
    if " - " in choice:
        task_id = choice.split(" - ")[0]
        entry_issue.delete(0, "end")
        entry_issue.insert(0, task_id)

def update_task_dropdown():
    combo_saved_tasks.configure(values=[f"{tid} - {desc}" for tid, desc in saved_tasks.items()])

# -------------------- UI --------------------
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

root = ctk.CTk()
root.title("Redmine Time Logger")
root.geometry("500x450")

frame = ctk.CTkFrame(root)
frame.pack(padx=20, pady=20, fill="both", expand=True)

# Grid – dwie równe kolumny
frame.columnconfigure(0, weight=1, uniform="a")
frame.columnconfigure(1, weight=2, uniform="a")

row = 0
ctk.CTkLabel(frame, text="Saved Tasks").grid(row=row, column=0, padx=10, pady=8, sticky="e")
combo_saved_tasks = ctk.CTkComboBox(frame, values=[], command=load_selected_task, width=250)
combo_saved_tasks.grid(row=row, column=1, padx=10, pady=8, sticky="w")

row += 1
ctk.CTkLabel(frame, text="Issue ID").grid(row=row, column=0, padx=10, pady=8, sticky="e")
entry_issue = ctk.CTkEntry(frame, width=250)
entry_issue.grid(row=row, column=1, padx=10, pady=8, sticky="w")

row += 1
ctk.CTkLabel(frame, text="Task Desc").grid(row=row, column=0, padx=10, pady=8, sticky="e")
entry_task_desc = ctk.CTkEntry(frame, width=250)
entry_task_desc.grid(row=row, column=1, padx=10, pady=8, sticky="w")

row += 1
save_task_btn = ctk.CTkButton(frame, text="💾 Zapisz Task", command=save_task_action)
save_task_btn.grid(row=row, column=0, columnspan=2, pady=8)

row += 1
ctk.CTkLabel(frame, text="Hours").grid(row=row, column=0, padx=10, pady=8, sticky="e")
entry_hours = ctk.CTkEntry(frame, width=250)
entry_hours.grid(row=row, column=1, padx=10, pady=8, sticky="w")

row += 1
ctk.CTkLabel(frame, text="Comments").grid(row=row, column=0, padx=10, pady=8, sticky="e")
entry_comments = ctk.CTkEntry(frame, width=250)
entry_comments.grid(row=row, column=1, padx=10, pady=8, sticky="w")

row += 1
ctk.CTkLabel(frame, text="Activity").grid(row=row, column=0, padx=10, pady=8, sticky="e")
combo_activity = ctk.CTkComboBox(frame, values=list(ACTIVITIES.keys()), width=250)
combo_activity.grid(row=row, column=1, padx=10, pady=8, sticky="w")
combo_activity.set("Development")

row += 1
ctk.CTkLabel(frame, text="Spent On").grid(row=row, column=0, padx=10, pady=8, sticky="e")
entry_spent_on = DateEntry(frame, width=12, background='darkblue', foreground='white',
                           borderwidth=2, year=date.today().year,
                           month=date.today().month, day=date.today().day)
entry_spent_on.grid(row=row, column=1, padx=10, pady=8, sticky="w")

row += 1
button = ctk.CTkButton(frame, text="🚀 Wyślij", command=send_time_entry, width=200)
button.grid(row=row, column=0, columnspan=2, pady=20)

# Wczytaj zapisane taski
saved_tasks = load_tasks()
update_task_dropdown()

root.mainloop()