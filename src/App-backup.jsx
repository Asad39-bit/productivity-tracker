
import { useState, useEffect } from 'react';
import './App.css';
const getToday = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
function App() {
  const [task, setTask] = useState('');

  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem('myTasks');
    return savedTasks ? JSON.parse(savedTasks) : [];
  });

  const [completedTasks, setCompletedTasks] = useState(() => {
    const savedCompleted = localStorage.getItem('myCompletedTasks');
    return savedCompleted ? JSON.parse(savedCompleted) : [];
  });

  useEffect(() => {
    localStorage.setItem('myTasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(
      'myCompletedTasks',
      JSON.stringify(completedTasks)
    );
  }, [completedTasks]);

  const addTask = () => {
    if (task.trim() !== '') {
      setTasks([...tasks, task.trim()]);
      setTask('');
    }
  };

  const deleteTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
    setCompletedTasks(
      completedTasks
        .filter(i => i !== index)
        .map(i => i > index ? i - 1 : i)
    );
  };

  const toggleComplete = (index) => {
    setCompletedTasks(
      completedTasks.includes(index)
        ? completedTasks.filter(i => i !== index)
        : [...completedTasks, index]
    );
  };

  return (
    <div className="app">
      <div className="todo-card">
        <h1>My Todo App</h1>
        <p className="subtitle">Plan your day, one task at a time.</p>

        <div className="task-input">
          <input
            type="text"
            placeholder="What do you need to do?"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTask();
            }}
          />
          <button className="add-btn" onClick={addTask}>
            Add Task
          </button>
        </div>

        <ul className="task-list">
          {tasks.map((item, index) => (
            <li className="task-item" key={index}>
              <span
                className={
                  completedTasks.includes(index)
                    ? 'task-text completed'
                    : 'task-text'
                }
              >
                {item}
              </span>

              <div className="task-actions">
                <button
                  className="complete-btn"
                  onClick={() => toggleComplete(index)}
                >
                  {completedTasks.includes(index) ? 'Undo' : 'Complete'}
                </button>

                <button
                  className="delete-btn"
                  onClick={() => deleteTask(index)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        {tasks.length === 0 && (
          <p className="empty-message">No tasks yet. Add your first task!</p>
        )}

        <p className="task-count">
          Completed: {completedTasks.length} / {tasks.length}
        </p>
      </div>
    </div>
  );
}

export default App;