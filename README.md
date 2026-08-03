# HabitSphere

Terminal-based habit tracker with JSON persistence, streaks, completion analytics, weekly/monthly reports, recommendations, logging, and optional charts.

## Run

```powershell
pip install -r requirements.txt
python habitsphere.py
```

Data is saved in `habits_data.json` beside the application. Pandas powers the analytics table and Matplotlib powers the chart; the core tracker still runs if they are not installed.
