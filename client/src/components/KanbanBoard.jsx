import { useState } from 'react';
import TaskCard from './TaskCard';

const columns = [
  { id: 'todo', label: 'To Do', dotClass: 'dot-todo' },
  { id: 'in_progress', label: 'In Progress', dotClass: 'dot-in_progress' },
  { id: 'done', label: 'Done', dotClass: 'dot-done' },
];

const KanbanBoard = ({ tasks, onTaskClick, isProjectAdmin, onAddTask, onStatusChange, canDragTask }) => {
  const [dragOverCol, setDragOverCol] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  const getTasksByStatus = (status) => tasks.filter(t => t.status === status);

  const handleDragStart = (e, task) => {
    if (canDragTask && !canDragTask(task)) return;
    setDraggingId(task.id);
    e.dataTransfer.setData('taskId', String(task.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  };

  const handleDragLeave = () => setDragOverCol(null);

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    setDraggingId(null);

    const taskId = parseInt(e.dataTransfer.getData('taskId'), 10);
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    if (onStatusChange) {
      onStatusChange(task, newStatus);
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverCol(null);
  };

  return (
    <div className="kanban-board">
      {columns.map(col => {
        const colTasks = getTasksByStatus(col.id);
        const isDropTarget = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            className={`kanban-col ${isDropTarget ? 'kanban-col-dragover' : ''}`}
            id={`kanban-col-${col.id}`}
            onDragOver={e => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, col.id)}
          >
            <div className="kanban-col-header">
              <div className="kanban-col-title">
                <div className={`kanban-col-dot ${col.dotClass}`} />
                {col.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="kanban-count">{colTasks.length}</span>
                {isProjectAdmin && col.id === 'todo' && (
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ padding: '4px 8px', fontSize: '1rem' }}
                    onClick={onAddTask}
                    title="Add task"
                    id="kanban-add-task-btn"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
            <div className="kanban-col-body">
              {colTasks.length === 0 ? (
                <div className="kanban-empty-dropzone">
                  {canDragTask ? 'Drop tasks here' : 'No tasks here'}
                </div>
              ) : (
                colTasks.map(task => (
                  <div
                    key={task.id}
                    draggable={!canDragTask || canDragTask(task)}
                    onDragStart={e => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    className={draggingId === task.id ? 'kanban-dragging' : ''}
                  >
                    <TaskCard task={task} onClick={onTaskClick} />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
