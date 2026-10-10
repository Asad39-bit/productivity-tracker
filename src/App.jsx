
import { useState, useEffect } from 'react';
import './App.css';

// Get today's date in YYYY-MM-DD format.
const getToday = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// Convert a timestamp into a local date.
const getDateKey = (timestamp) => {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// Move a date forward or backward by a number of days.
const shiftDate = (dateString, amount) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day + amount);

  return getDateKey(date.getTime());
};

// Display a date in a readable format.
const formatDate = (dateString) => {
  if (!dateString) return 'Not set';

  const [year, month, day] = dateString.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString(
    undefined,
    { day: 'numeric', month: 'short', year: 'numeric' }
  );
};

// Display a timestamp as a clock time.
const formatTime = (timestamp) => {
  if (!timestamp) return 'Not started';

  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Convert seconds into hours, minutes and seconds.
const formatDuration = (seconds) => {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;

  return `${remainingSeconds}s`;
};

// Load the new format or migrate your existing saved tasks.
const loadTasks = () => {
  try {
    const saved = localStorage.getItem('productivityTasks');

    if (saved !== null) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed.map((item, index) => ({
          id: item.id ?? `task-${Date.now()}-${index}`,
          title: item.title ?? '',
          date: item.date || getToday(),
          completed: Boolean(item.completed),
          completedAt: item.completedAt ?? null,
          manualMinutes: Number(item.manualMinutes) || 0,
          trackedSeconds: Number(item.trackedSeconds) || 0,
          timerStartedAt: item.timerStartedAt ?? null,
          firstStartedAt: item.firstStartedAt ?? null,
          lastEndedAt: item.lastEndedAt ?? null,
        }));
      }
    }

    // Read tasks from the original Todo App.
    const oldTasks = JSON.parse(
      localStorage.getItem('myTasks') || '[]'
    );

    const oldCompleted = JSON.parse(
      localStorage.getItem('myCompletedTasks') || '[]'
    );

    return oldTasks.map((item, index) => {
      const isCompleted = oldCompleted.includes(index);

      return {
        id: `old-${Date.now()}-${index}`,
        title: typeof item === 'string' ? item : item.title || '',
        date: getToday(),
        completed: isCompleted,
        completedAt: isCompleted ? Date.now() : null,
        manualMinutes: 0,
        trackedSeconds: 0,
        timerStartedAt: null,
        firstStartedAt: null,
        lastEndedAt: null,
      };
    });
  } catch (error) {
    console.error('Could not load saved tasks:', error);
    return [];
  }
};

// Calculate current and best consecutive-day streaks.
const getStreakStats = (tasks, today) => {
  const completedDates = new Set(
    tasks
      .filter((task) => task.completedAt)
      .map((task) => getDateKey(task.completedAt))
  );

  let current = 0;

  // If today has no completed task yet, check from yesterday.
  let cursor = completedDates.has(today)
    ? today
    : shiftDate(today, -1);

  while (completedDates.has(cursor)) {
    current++;
    cursor = shiftDate(cursor, -1);
  }

  const sortedDates = [...completedDates].sort();
  let run = 0;
  let best = 0;
  let previous = null;

  sortedDates.forEach((date) => {
    run =
      previous && shiftDate(previous, 1) === date
        ? run + 1
        : 1;

    best = Math.max(best, run);
    previous = date;
  });

  return { current, best };
};

function App() {
  const [task, setTask] = useState('');
  const [taskDate, setTaskDate] = useState(getToday());
  const [tasks, setTasks] = useState(loadTasks);
  const [manualInputs, setManualInputs] = useState({});
  const [filter, setFilter] = useState('today');
  const [clockNow, setClockNow] = useState(Date.now());

  // Save all task and tracking information.
  useEffect(() => {
    localStorage.setItem(
      'productivityTasks',
      JSON.stringify(tasks)
    );
  }, [tasks]);

  // Refresh the displayed timer every second when a timer is running.
  const hasRunningTimer = tasks.some(
    (item) => item.timerStartedAt !== null
  );

  useEffect(() => {
    if (!hasRunningTimer) return;

    const interval = setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [hasRunningTimer]);

  // Add a new task.
  const addTask = () => {
    const title = task.trim();

    if (!title) return;

    const newTask = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      date: taskDate || getToday(),
      completed: false,
      completedAt: null,
      manualMinutes: 0,
      trackedSeconds: 0,
      timerStartedAt: null,
      firstStartedAt: null,
      lastEndedAt: null,
    };

    setTasks((current) => [...current, newTask]);
    setTask('');
  };

  // Complete a task or undo its completion.
  const toggleComplete = (taskId) => {
    const now = Date.now();

    setTasks((current) =>
      current.map((item) => {
        if (item.id !== taskId) return item;

        const completing = !item.completed;
        let trackedSeconds = item.trackedSeconds;

        // Stop and record the timer when completing a running task.
        if (completing && item.timerStartedAt) {
          trackedSeconds += Math.floor(
            (now - item.timerStartedAt) / 1000
          );
        }

        return {
          ...item,
          completed: completing,
          completedAt: completing ? now : null,
          trackedSeconds,
          timerStartedAt: completing ? null : item.timerStartedAt,
          lastEndedAt:
            completing && item.timerStartedAt
              ? now
              : item.lastEndedAt,
        };
      })
    );
  };

  // Delete a task.
  const deleteTask = (taskId) => {
    setTasks((current) =>
      current.filter((item) => item.id !== taskId)
    );
  };

  // Start the selected timer. Starting another task pauses the previous timer.
  const startTimer = (taskId) => {
    const now = Date.now();

    setTasks((current) =>
      current.map((item) => {
        if (item.id === taskId) {
          if (item.timerStartedAt) return item;

          return {
            ...item,
            timerStartedAt: now,
            firstStartedAt: item.firstStartedAt || now,
          };
        }

        if (item.timerStartedAt) {
          return {
            ...item,
            trackedSeconds:
              item.trackedSeconds +
              Math.floor((now - item.timerStartedAt) / 1000),
            timerStartedAt: null,
            lastEndedAt: now,
          };
        }

        return item;
      })
    );
  };

  // Pause the selected timer and save its elapsed time.
  const pauseTimer = (taskId) => {
    const now = Date.now();

    setTasks((current) =>
      current.map((item) => {
        if (item.id !== taskId || !item.timerStartedAt) {
          return item;
        }

        return {
          ...item,
          trackedSeconds:
            item.trackedSeconds +
            Math.floor((now - item.timerStartedAt) / 1000),
          timerStartedAt: null,
          lastEndedAt: now,
        };
      })
    );
  };

  // Add manually entered minutes to a task.
  const addManualMinutes = (taskId) => {
    const minutes = Number(manualInputs[taskId]);

    if (!Number.isFinite(minutes) || minutes <= 0) return;

    setTasks((current) =>
      current.map((item) =>
        item.id === taskId
          ? {
              ...item,
              manualMinutes: item.manualMinutes + minutes,
            }
          : item
      )
    );

    setManualInputs((current) => ({
      ...current,
      [taskId]: '',
    }));
  };

  // Calculate today's and all-time progress.
  const today = getToday();

  const todayTasks = tasks.filter(
    (item) => item.date === today
  );

  const todayCompleted = todayTasks.filter(
    (item) => item.completed
  ).length;

  const todayPending = todayTasks.length - todayCompleted;

  const totalCompleted = tasks.filter(
    (item) => item.completed
  ).length;

  const totalManualMinutes = tasks.reduce(
    (sum, item) => sum + item.manualMinutes,
    0
  );

  const getTrackedSeconds = (item) =>
    item.trackedSeconds +
    (item.timerStartedAt
      ? Math.max(0, Math.floor((clockNow - item.timerStartedAt) / 1000))
      : 0);

  const totalTrackedSeconds = tasks.reduce(
    (sum, item) => sum + getTrackedSeconds(item),
    0
  );

  const todayManualMinutes = todayTasks.reduce(
    (sum, item) => sum + item.manualMinutes,
    0
  );

  const todayTrackedSeconds = todayTasks.reduce(
    (sum, item) => sum + getTrackedSeconds(item),
    0
  );

  const streak = getStreakStats(tasks, today);

  // Select which tasks to display.
  const visibleTasks = tasks
    .filter((item) => {
      if (filter === 'today') return item.date === today;
      if (filter === 'pending') return !item.completed;
      if (filter === 'completed') return item.completed;

      return true;
    })
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <main className="app">
      <div className="todo-card">
        <header className="app-header">
          <div>
            <p className="eyebrow">YOUR PERSONAL PRODUCTIVITY</p>
            <h1>Daily Tracker</h1>
            <p className="subtitle">
              Plan your day. Track your time. Build your streak.
            </p>
          </div>

          <div className="date-chip">
            <span>Today</span>
            <strong>{formatDate(today)}</strong>
          </div>
        </header>

        <section className="dashboard">
          <article className="stat-card">
            <span className="stat-icon">✓</span>
            <p>Completed Today</p>
            <h2>{todayCompleted}</h2>
            <small>of {todayTasks.length} planned tasks</small>
          </article>

          <article className="stat-card">
            <span className="stat-icon">◷</span>
            <p>Pending Today</p>
            <h2>{todayPending}</h2>
            <small>tasks left to do</small>
          </article>

          <article className="stat-card">
            <span className="stat-icon">🔥</span>
            <p>Current Streak</p>
            <h2>{streak.current} days</h2>
            <small>Best: {streak.best} days</small>
          </article>

          <article className="stat-card">
            <span className="stat-icon">⏱</span>
            <p>Tracked Today</p>
            <h2>{formatDuration(todayTrackedSeconds)}</h2>
            <small>automatic timer</small>
          </article>
        </section>

        <section className="time-summary">
          <div>
            <span>Today's manual time</span>
            <strong>{todayManualMinutes} min</strong>
          </div>
          <div>
            <span>All-time tracked time</span>
            <strong>{formatDuration(totalTrackedSeconds)}</strong>
          </div>
          <div>
            <span>All-time manual time</span>
            <strong>{totalManualMinutes} min</strong>
          </div>
          <div>
            <span>All tasks completed</span>
            <strong>{totalCompleted} / {tasks.length}</strong>
          </div>
        </section>

        <section className="add-section">
          <h2>Add a task</h2>

          <div className="task-input">
            <input
              type="text"
              placeholder="What do you need to do?"
              value={task}
              onChange={(event) => setTask(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addTask();
              }}
            />

            <input
              className="date-input"
              type="date"
              value={taskDate}
              onChange={(event) => setTaskDate(event.target.value)}
            />

            <button className="add-btn" onClick={addTask}>
              + Add Task
            </button>
          </div>
        </section>

        <section className="tasks-section">
          <div className="section-heading">
            <div>
              <h2>Your tasks</h2>
              <p>Manage tasks and record the time you spend.</p>
            </div>

            <span className="task-total">{tasks.length} total</span>
          </div>

          <div className="filter-bar">
            {[
              ['today', 'Today'],
              ['all', 'All Tasks'],
              ['pending', 'Pending'],
              ['completed', 'Completed'],
            ].map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? 'filter-btn active' : 'filter-btn'}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {visibleTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-symbol">✓</div>
              <h3>No tasks here yet</h3>
              <p>Add a task or choose another filter to view your records.</p>
            </div>
          ) : (
            <div className="task-list">
              {visibleTasks.map((item) => {
                const isRunning = Boolean(item.timerStartedAt);

                return (
                  <article
                    className={item.completed ? 'task-item is-completed' : 'task-item'}
                    key={item.id}
                  >
                    <div className="task-main">
                      <button
                        className={item.completed ? 'task-check checked' : 'task-check'}
                        onClick={() => toggleComplete(item.id)}
                        aria-label={item.completed ? 'Undo completion' : 'Complete task'}
                        title={item.completed ? 'Undo completion' : 'Complete task'}
                      >
                        {item.completed ? '✓' : ''}
                      </button>

                      <div className="task-details">
                        <h3>{item.title}</h3>
                        <div className="task-meta">
                          <span>📅 {formatDate(item.date)}</span>
                          {item.completed && (
                            <span>✓ Completed {formatTime(item.completedAt)}</span>
                          )}
                        </div>
                      </div>

                      <span className={item.completed ? 'status completed-status' : 'status pending-status'}>
                        {item.completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>

                    <div className="task-time-panel">
                      <div className="time-line">
                        <span>Automatic time</span>
                        <strong>{formatDuration(getTrackedSeconds(item))}</strong>
                      </div>

                      <div className="time-line">
                        <span>Manual time</span>
                        <strong>{item.manualMinutes} min</strong>
                      </div>

                      <div className="time-line">
                        <span>First started</span>
                        <strong>{formatTime(item.firstStartedAt)}</strong>
                      </div>

                      <div className="time-line">
                        <span>Last paused</span>
                        <strong>{formatTime(item.lastEndedAt)}</strong>
                      </div>
                    </div>

                    <div className="task-controls">
                      <button
                        className="timer-btn"
                        onClick={() =>
                          isRunning
                            ? pauseTimer(item.id)
                            : startTimer(item.id)
                        }
                        disabled={item.completed}
                      >
                        {isRunning ? 'Ⅱ Pause Timer' : '▶ Start Timer'}
                      </button>

                      <div className="manual-entry">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Minutes"
                          value={manualInputs[item.id] ?? ''}
                          onChange={(event) =>
                            setManualInputs((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                          aria-label={`Manual minutes for ${item.title}`}
                        />
                        <button
                          className="manual-btn"
                          onClick={() => addManualMinutes(item.id)}
                        >
                          + Add Time
                        </button>
                      </div>

                      <button
                        className="complete-action"
                        onClick={() => toggleComplete(item.id)}
                      >
                        {item.completed ? 'Undo' : 'Complete'}
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => deleteTask(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="app-footer">
          <span>Saved automatically in this browser</span>
          <span>{totalCompleted} completed · {tasks.length - totalCompleted} pending overall</span>
        </footer>
      </div>
    </main>
  );
}

export default App;