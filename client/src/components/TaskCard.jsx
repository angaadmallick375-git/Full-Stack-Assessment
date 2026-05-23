import { format, parseISO, isPast } from 'date-fns';

const priorityLabel = { high: 'High', medium: 'Medium', low: 'Low' };
const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };

const TaskCard = ({ task, onClick, draggable }) => {
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
  const initials = task.assignee_name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div
      className={`task-card ${draggable ? 'task-card-draggable' : ''}`}
      onClick={() => onClick(task)}
      id={`task-card-${task.id}`}
    >
      <div className={`task-priority-bar ${task.priority}`} />
      <div style={{ paddingLeft: '8px' }}>
        <div className="task-card-title">{task.title}</div>
        
        {task.tags && task.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {task.tags.map(tag => {
              const getTagColor = (t) => {
                const colors = ['#6366f1', '#818cf8', '#38bdf8', '#4f46e5', '#a5b4fc', '#ef4444', '#4ade80'];
                let hash = 0;
                for (let i = 0; i < t.length; i++) hash = t.charCodeAt(i) + ((hash << 5) - hash);
                return colors[Math.abs(hash) % colors.length];
              };
              const color = getTagColor(tag);
              return (
                <span key={tag} style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: color + '20', color: color, border: `1px solid ${color}50` }}>
                  #{tag}
                </span>
              );
            })}
          </div>
        )}

        {task.description && (
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            marginBottom: '6px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {task.description}
          </div>
        )}

        <div className="task-card-meta">
          <span className={`badge badge-${task.priority}`}>{priorityLabel[task.priority]}</span>

          {task.due_date && (
            <span className={`due-date ${isOverdue ? 'overdue' : ''}`}>
              📅 {format(parseISO(task.due_date), 'MMM d')}
              {isOverdue && ' ⚠️'}
            </span>
          )}

          {task.blocked_by && (
            <span className="badge badge-danger" title={`Blocked by task #${task.blocked_by}`}>
              ⚠️ Blocked
            </span>
          )}

          {task.assignee_name && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div className="avatar avatar-sm" title={task.assignee_name}>
                {initials}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
