"""HabitSphere - a JSON-backed habit tracker with analytics and reports.

Run: python habitsphere.py
Optional charts require: pip install pandas matplotlib
"""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

try:
    import pandas as pd
except ImportError:  # Core tracking works without optional analysis packages.
    pd = None


DATA_FILE = Path("habits_data.json")
LOG_FILE = Path("habitsphere.log")
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s",
)


@dataclass
class Habit:
    """One personal habit and its completed calendar dates."""

    name: str
    frequency: str = "daily"  # daily, weekly, monthly
    goal: int = 1
    created_on: str = field(default_factory=lambda: date.today().isoformat())
    completions: List[str] = field(default_factory=list)

    def record_completion(self, completed_on: date) -> bool:
        value = completed_on.isoformat()
        if value in self.completions:
            return False
        self.completions.append(value)
        self.completions.sort()
        return True

    def completion_dates(self) -> List[date]:
        return sorted(date.fromisoformat(value) for value in self.completions)


class HabitManager:
    """Handles habits, JSON persistence, statistics, reports, and recommendations."""

    VALID_FREQUENCIES = {"daily", "weekly", "monthly"}

    def __init__(self, data_file: Path = DATA_FILE) -> None:
        self.data_file = data_file
        self.habits: Dict[str, Habit] = {}
        self.load()

    def load(self) -> None:
        if not self.data_file.exists():
            return
        try:
            payload = json.loads(self.data_file.read_text(encoding="utf-8"))
            self.habits = {
                item["name"].lower(): Habit(**item) for item in payload.get("habits", [])
            }
            logging.info("Loaded %d habits", len(self.habits))
        except (OSError, json.JSONDecodeError, TypeError, KeyError) as exc:
            logging.exception("Could not load habit data")
            raise RuntimeError(f"Could not read {self.data_file}: {exc}") from exc

    def save(self) -> None:
        payload = {"habits": [asdict(habit) for habit in self.habits.values()]}
        try:
            self.data_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
            logging.info("Saved %d habits", len(self.habits))
        except OSError as exc:
            logging.exception("Could not save habit data")
            raise RuntimeError(f"Could not save data: {exc}") from exc

    def add_habit(self, name: str, frequency: str, goal: int) -> None:
        key = name.strip().lower()
        frequency = frequency.lower().strip()
        if not key:
            raise ValueError("Habit name cannot be empty.")
        if key in self.habits:
            raise ValueError("A habit with that name already exists.")
        if frequency not in self.VALID_FREQUENCIES:
            raise ValueError("Frequency must be daily, weekly, or monthly.")
        if goal < 1:
            raise ValueError("Goal must be at least 1.")
        self.habits[key] = Habit(name=name.strip(), frequency=frequency, goal=goal)
        self.save()

    def delete_habit(self, name: str) -> None:
        key = name.strip().lower()
        if key not in self.habits:
            raise ValueError("Habit not found.")
        del self.habits[key]
        self.save()

    def complete_habit(self, name: str, completed_on: Optional[date] = None) -> bool:
        key = name.strip().lower()
        if key not in self.habits:
            raise ValueError("Habit not found.")
        added = self.habits[key].record_completion(completed_on or date.today())
        if added:
            self.save()
        return added

    @staticmethod
    def _period_start(today: date, days: int) -> date:
        return today - timedelta(days=days - 1)

    def completion_percentage(self, habit: Habit, days: int = 30, today: Optional[date] = None) -> float:
        today = today or date.today()
        start = self._period_start(today, days)
        completed = sum(start <= day <= today for day in habit.completion_dates())
        if habit.frequency == "daily":
            expected = days * habit.goal
        elif habit.frequency == "weekly":
            expected = ((days + 6) // 7) * habit.goal
        else:
            expected = max(1, round(days / 30)) * habit.goal
        return min(100.0, round(completed / expected * 100, 1)) if expected else 0.0

    def current_streak(self, habit: Habit, today: Optional[date] = None) -> int:
        """Return consecutive daily completion streak ending today or yesterday."""
        done = set(habit.completion_dates())
        cursor = today or date.today()
        if cursor not in done:
            cursor -= timedelta(days=1)
        streak = 0
        while cursor in done:
            streak += 1
            cursor -= timedelta(days=1)
        return streak

    def longest_streak(self, habit: Habit) -> int:
        dates = habit.completion_dates()
        if not dates:
            return 0
        best = current = 1
        for previous, current_day in zip(dates, dates[1:]):
            if current_day == previous + timedelta(days=1):
                current += 1
            else:
                current = 1
            best = max(best, current)
        return best

    def analysis_rows(self, days: int = 30) -> List[dict]:
        rows = []
        for habit in self.habits.values():
            percentage = self.completion_percentage(habit, days)
            status = "successful" if percentage >= 75 else "needs attention"
            rows.append({
                "Habit": habit.name,
                "Frequency": habit.frequency,
                "Goal": habit.goal,
                "Completion %": percentage,
                "Current streak": self.current_streak(habit),
                "Best streak": self.longest_streak(habit),
                "Status": status,
            })
        return rows

    def report(self, days: int) -> str:
        title = "Weekly" if days == 7 else "Monthly"
        rows = self.analysis_rows(days)
        lines = [f"{title} HabitSphere Report ({days} days)", "=" * 42]
        if not rows:
            return "\n".join(lines + ["No habits created yet."])
        for row in rows:
            lines.append(
                f"{row['Habit']}: {row['Completion %']}% | current streak: "
                f"{row['Current streak']} | {row['Status']}"
            )
        average = sum(row["Completion %"] for row in rows) / len(rows)
        lines.append(f"Overall consistency: {average:.1f}%")
        return "\n".join(lines)

    def suggestions(self, days: int = 30) -> List[str]:
        advice = []
        for habit in self.habits.values():
            percentage = self.completion_percentage(habit, days)
            streak = self.current_streak(habit)
            if percentage < 40:
                advice.append(f"{habit.name}: reduce the goal or attach it to an existing daily routine.")
            elif percentage < 75:
                advice.append(f"{habit.name}: schedule a fixed reminder; consistency is {percentage}%.")
            elif streak >= 7:
                advice.append(f"{habit.name}: excellent {streak}-day streak—consider a slightly bigger goal.")
            else:
                advice.append(f"{habit.name}: strong progress; protect your routine on busy days.")
        return advice or ["Create a habit to receive personalised suggestions."]

    def dataframe(self, days: int = 30):
        if pd is None:
            raise RuntimeError("Install pandas to use tabular analytics: pip install pandas")
        return pd.DataFrame(self.analysis_rows(days))

    def show_chart(self, days: int = 30) -> None:
        if pd is None:
            raise RuntimeError("Install pandas and matplotlib for charts: pip install pandas matplotlib")
        import matplotlib.pyplot as plt
        frame = self.dataframe(days)
        if frame.empty:
            raise ValueError("Create a habit before displaying a chart.")
        frame.plot.bar(x="Habit", y="Completion %", legend=False, color="#4C78A8", ylim=(0, 100))
        plt.ylabel("Completion percentage")
        plt.title(f"Habit performance: last {days} days")
        plt.tight_layout()
        plt.show()


def choose_habit(manager: HabitManager) -> str:
    if not manager.habits:
        raise ValueError("No habits available. Create one first.")
    print("Habits:", ", ".join(habit.name for habit in manager.habits.values()))
    return input("Habit name: ")


def main() -> None:
    manager = HabitManager()
    actions = {
        "1": "Create habit", "2": "Record completion", "3": "List analytics",
        "4": "Weekly report", "5": "Monthly report", "6": "Suggestions",
        "7": "Show chart", "8": "Delete habit", "0": "Exit",
    }
    while True:
        print("\nHabitSphere")
        for key, label in actions.items():
            print(f"{key}. {label}")
        try:
            choice = input("Choose an action: ").strip()
            if choice == "0":
                print("Progress saved. Keep going!")
                return
            if choice == "1":
                name = input("Habit name: ")
                frequency = input("Frequency (daily/weekly/monthly): ")
                goal = int(input("Completions required per frequency period: "))
                manager.add_habit(name, frequency, goal)
                print("Habit created.")
            elif choice == "2":
                name = choose_habit(manager)
                raw_date = input("Date (YYYY-MM-DD, blank for today): ").strip()
                completed_on = date.fromisoformat(raw_date) if raw_date else date.today()
                print("Completion recorded." if manager.complete_habit(name, completed_on) else "Already recorded for that date.")
            elif choice == "3":
                rows = manager.analysis_rows(30)
                if pd is not None:
                    print(manager.dataframe(30).to_string(index=False) if rows else "No habits created yet.")
                else:
                    for row in rows:
                        print(row)
            elif choice == "4":
                print(manager.report(7))
            elif choice == "5":
                print(manager.report(30))
            elif choice == "6":
                print("\n".join(f"- {item}" for item in manager.suggestions()))
            elif choice == "7":
                manager.show_chart(30)
            elif choice == "8":
                manager.delete_habit(choose_habit(manager))
                print("Habit deleted.")
            else:
                print("Please choose one of the listed options.")
        except (ValueError, RuntimeError) as exc:
            logging.warning("User-facing error: %s", exc)
            print(f"Error: {exc}")
        except KeyboardInterrupt:
            print("\nProgress saved. Goodbye!")
            return


if __name__ == "__main__":
    main()
