import { format, parseISO, isPast } from 'date-fns';

const priorityLabel = { high: 'High', medium: 'Medium', low: 'Low' };
const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };

const TaskCard = ({ task, onClick, draggable }) => {
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
  const initials = task.assignee_name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div
      className={`task-card ${draggable ? 'task-card-draggable' : ''} animate-fadeIn`}
      onClick={() => onClick(task)}
      id={`task-card-${task.id}`}
      style={{
        animationDelay: `${Math.random() * 0.3}s`
      }}
    >
      <div className={`task-priority-bar ${task.priority}`} />
      <div style={{ paddingLeft: '12px', flex: 1 }}>
        <div className="task-card-title">{task.title}</div>
        
        {task.tags && task.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px', marginTop: '4px' }}>
            {task.tags.map(tag => {
              const getTagColor = (t) => {
                const colors = ['#6366f1', '#818cf8', '#38bdf8', '#4f46e5', '#a5b4fc', '#ef4444', '#4ade80', '#fbbf24'];
                let hash = 0;
                for (let i = 0; i < t.length; i++) hash = t.charCodeAt(i) + ((hash << 5) - hash);
                return colors[Math.abs(hash) % colors.length];
              };
              const color = getTagColor(tag);
              return (
                <span key={tag} style={{ 
                  fontSize: '0.65rem', 
                  padding: '3px 8px', 
                  borderRadius: '6px', 
                  background: color + '18', 
                  color: color, 
                  border: `1.5px solid ${color}40`,
                  fontWeight: 500,
                  letterSpacing: '0.02em'
                }}>
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
            marginBottom: '10px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word'
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
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="avatar avatar-sm" title={task.assignee_name}>
                {initials}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{task.assignee_name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
