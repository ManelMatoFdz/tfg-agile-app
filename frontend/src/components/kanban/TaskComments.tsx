import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Pencil, Trash2, MessageSquare, Check, X } from 'lucide-react';
import type { TaskComment, Task, UserSummary } from '../../types';
import { tasksApi } from '../../api/tasks';
import { AssigneeAvatar } from './TaskModal';
import { useAuthStore } from '../../store/authStore';

// ── Mention token format ─────────────────────────────────────────────────
// @{userId:DisplayName}  and  #{taskId:Title}

function insertMentionToken(type: '@' | '#', id: string, label: string): string {
  return type === '@' ? `@{${id}:${label}}` : `#{${id}:${label}}`;
}

const MENTION_REGEX = /(@|#)\{([^:}]+):([^}]+)\}/g;

interface MentionPart {
  type: 'text' | 'user' | 'task';
  value: string;
  id?: string;
}

function parseMentions(content: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(MENTION_REGEX)) {
    const before = content.slice(lastIndex, match.index);
    if (before) parts.push({ type: 'text', value: before });

    const kind = match[1] === '@' ? 'user' : 'task';
    parts.push({ type: kind, value: match[3], id: match[2] });

    lastIndex = match.index! + match[0].length;
  }

  const tail = content.slice(lastIndex);
  if (tail) parts.push({ type: 'text', value: tail });

  return parts;
}

// ── Relative time ────────────────────────────────────────────────────────

function useRelativeTime(t: (key: string, opts?: Record<string, unknown>) => string) {
  return useCallback(
    (dateStr: string) => {
      const now = Date.now();
      const then = new Date(dateStr).getTime();
      const diffSec = Math.floor((now - then) / 1000);

      if (diffSec < 60) return t('tasks.comments.justNow');
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return t('tasks.comments.minutesAgo', { count: diffMin });
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return t('tasks.comments.hoursAgo', { count: diffHr });
      const diffDay = Math.floor(diffHr / 24);
      if (diffDay === 1) return t('tasks.comments.yesterday');
      if (diffDay < 7) return t('tasks.comments.daysAgo', { count: diffDay });
      return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    },
    [t],
  );
}

// ── Autocomplete dropdown ────────────────────────────────────────────────

interface AutocompleteItem {
  id: string;
  label: string;
  secondary?: string;
  avatar?: string;
  avatarUrl?: string | null;
}

function AutocompleteDropdown({
  items,
  onSelect,
  position,
}: {
  items: AutocompleteItem[];
  onSelect: (item: AutocompleteItem) => void;
  position: { top: number; left: number };
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    setSelectedIdx(0);
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 60,
        minWidth: 200,
        maxWidth: 300,
        maxHeight: 180,
        overflowY: 'auto',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: 4,
      }}
    >
      {items.map((item, idx) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          onMouseEnter={() => setSelectedIdx(idx)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text)',
            background: idx === selectedIdx ? 'var(--accent-muted)' : 'transparent',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          {item.avatar && (
            <AssigneeAvatar name={item.avatar} avatarUrl={item.avatarUrl} size={20} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.label}
            </div>
            {item.secondary && (
              <div style={{ fontSize: 10, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.secondary}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Comment input with mentions ──────────────────────────────────────────

function CommentInput({
  onSubmit,
  members,
  tasks,
  initialValue = '',
  autoFocus = false,
  onCancel,
}: {
  onSubmit: (content: string) => Promise<void>;
  members: UserSummary[];
  tasks: Task[];
  initialValue?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const [sending, setSending] = useState(false);
  const [autocomplete, setAutocomplete] = useState<{
    type: '@' | '#';
    query: string;
    startIdx: number;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setValue(newVal);

    const cursorPos = e.target.selectionStart;
    const textBefore = newVal.slice(0, cursorPos);

    // Check for @ or # trigger
    const atMatch = textBefore.match(/@([^\s@#{}]*)$/);
    const hashMatch = textBefore.match(/#([^\s@#{}]*)$/);

    if (atMatch) {
      setAutocomplete({ type: '@', query: atMatch[1], startIdx: cursorPos - atMatch[0].length });
    } else if (hashMatch) {
      setAutocomplete({ type: '#', query: hashMatch[1], startIdx: cursorPos - hashMatch[0].length });
    } else {
      setAutocomplete(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && autocomplete) {
      e.preventDefault();
      setAutocomplete(null);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !autocomplete) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectAutocomplete = (item: AutocompleteItem) => {
    if (!autocomplete || !textareaRef.current) return;

    const before = value.slice(0, autocomplete.startIdx);
    const after = value.slice(textareaRef.current.selectionStart);
    const token = insertMentionToken(autocomplete.type, item.id, item.label);
    const newVal = before + token + ' ' + after;

    setValue(newVal);
    setAutocomplete(null);

    // Restore focus
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + token.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSubmit(trimmed);
      setValue('');
      setAutocomplete(null);
    } finally {
      setSending(false);
    }
  };

  // Build autocomplete items
  let acItems: AutocompleteItem[] = [];
  if (autocomplete) {
    const q = autocomplete.query.toLowerCase();
    if (autocomplete.type === '@') {
      acItems = members
        .filter((m) => {
          const name = (m.fullName || m.username).toLowerCase();
          return name.includes(q);
        })
        .slice(0, 8)
        .map((m) => ({
          id: m.id,
          label: m.fullName || m.username,
          secondary: m.fullName ? `@${m.username}` : undefined,
          avatar: m.fullName || m.username,
          avatarUrl: m.avatarUrl,
        }));
    } else {
      acItems = tasks
        .filter((tk) => tk.title.toLowerCase().includes(q))
        .slice(0, 8)
        .map((tk) => ({
          id: tk.id,
          label: tk.title,
        }));
    }
  }

  const isEditing = !!onCancel;

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: isEditing ? 'flex-start' : 'flex-end',
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t('tasks.comments.placeholder')}
          rows={isEditing ? 3 : 2}
          autoFocus={autoFocus}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            color: 'var(--text)',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            outline: 'none',
            resize: 'none',
            boxSizing: 'border-box' as const,
            transition: 'border-color 150ms',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || sending}
            title={isEditing ? t('common.save') : t('tasks.comments.send')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: value.trim() ? 'var(--accent)' : 'var(--bg-hover)',
              color: value.trim() ? '#fff' : 'var(--text-faint)',
              cursor: value.trim() && !sending ? 'pointer' : 'not-allowed',
              transition: 'all 150ms',
            }}
          >
            {isEditing ? <Check size={14} strokeWidth={2.5} /> : <Send size={14} strokeWidth={2} />}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              title={t('common.cancel')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete popup */}
      {autocomplete && acItems.length > 0 && (
        <AutocompleteDropdown
          items={acItems}
          onSelect={handleSelectAutocomplete}
          position={{ top: -4 - Math.min(acItems.length, 5) * 34, left: 0 }}
        />
      )}
    </div>
  );
}

// ── Rendered comment content ─────────────────────────────────────────────

function RenderedContent({
  content,
  onTaskClick,
}: {
  content: string;
  onTaskClick?: (taskId: string) => void;
}) {
  const parts = parseMentions(content);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.type === 'text') {
          return <Fragment key={i}>{part.value}</Fragment>;
        }
        if (part.type === 'user') {
          return (
            <span
              key={i}
              style={{
                display: 'inline',
                padding: '1px 6px',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--accent)',
                background: 'var(--accent-muted)',
                borderRadius: 'var(--radius-pill)',
                cursor: 'default',
              }}
            >
              @{part.value}
            </span>
          );
        }
        // task mention
        return (
          <span
            key={i}
            onClick={() => onTaskClick?.(part.id!)}
            style={{
              display: 'inline',
              padding: '1px 6px',
              fontSize: 12,
              fontWeight: 600,
              color: '#7C3AED',
              background: 'rgba(124,58,237,0.08)',
              borderRadius: 'var(--radius-pill)',
              cursor: onTaskClick ? 'pointer' : 'default',
            }}
          >
            #{part.value}
          </span>
        );
      })}
    </span>
  );
}

// ── Single comment row ───────────────────────────────────────────────────

function CommentRow({
  comment,
  userMap,
  canModify,
  onUpdate,
  onDelete,
  onTaskClick,
  members,
  tasks,
}: {
  comment: TaskComment;
  userMap: Record<string, UserSummary>;
  canModify: boolean;
  onUpdate: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTaskClick?: (taskId: string) => void;
  members: UserSummary[];
  tasks: Task[];
}) {
  const { t } = useTranslation();
  const relativeTime = useRelativeTime(t);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const author = userMap[comment.authorId];
  const authorName = author ? author.fullName || author.username : t('common.unknownUser');

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <AssigneeAvatar name={authorName} avatarUrl={author?.avatarUrl} size={28} />
        <div style={{ flex: 1 }}>
          <CommentInput
            onSubmit={async (content) => {
              await onUpdate(comment.id, content);
              setEditing(false);
            }}
            members={members}
            tasks={tasks}
            initialValue={comment.content}
            autoFocus
            onCancel={() => setEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <AssigneeAvatar name={authorName} avatarUrl={author?.avatarUrl} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            {authorName}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
            {relativeTime(comment.createdAt)}
          </span>
          {comment.editedAt && (
            <span style={{ fontSize: 10, color: 'var(--text-faint)', fontStyle: 'italic' }}>
              ({t('tasks.comments.edited')})
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, wordBreak: 'break-word' }}>
          <RenderedContent content={comment.content} onTaskClick={onTaskClick} />
        </div>

        {/* Actions */}
        {canModify && (
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={() => setEditing(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 11, fontWeight: 500, color: 'var(--text-faint)',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, transition: 'color 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; }}
            >
              <Pencil size={10} strokeWidth={2} />
              {t('tasks.comments.edit')}
            </button>
            {confirmDelete ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t('tasks.comments.deleteConfirm')}</span>
                <button
                  onClick={() => onDelete(comment.id)}
                  style={{
                    fontSize: 11, fontWeight: 600, color: '#DC2626',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  {t('common.delete')}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    fontSize: 11, fontWeight: 500, color: 'var(--text-faint)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  {t('common.cancel')}
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  fontSize: 11, fontWeight: 500, color: 'var(--text-faint)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, transition: 'color 150ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#DC2626'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; }}
              >
                <Trash2 size={10} strokeWidth={2} />
                {t('tasks.comments.delete')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────

interface TaskCommentsProps {
  taskId: string;
  projectId: string;
  members: { userId: string }[];
  userMap: Record<string, UserSummary>;
  isAdmin: boolean;
  onTaskClick?: (taskId: string) => void;
}

export default function TaskComments({
  taskId,
  projectId,
  members,
  userMap,
  isAdmin,
  onTaskClick,
}: TaskCommentsProps) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const memberSummaries: UserSummary[] = members
    .map((m) => userMap[m.userId])
    .filter(Boolean) as UserSummary[];

  useEffect(() => {
    tasksApi.getComments(taskId).then(setComments).catch(() => {}).finally(() => setLoading(false));
    tasksApi.getByProject(projectId).then(setProjectTasks).catch(() => {});
  }, [taskId, projectId]);

  const handleCreate = async (content: string) => {
    try {
      const created = await tasksApi.createComment(taskId, content);
      setComments((prev) => [...prev, created]);
    } catch {
      setError(t('tasks.comments.error'));
    }
  };

  const handleUpdate = async (commentId: string, content: string) => {
    try {
      const updated = await tasksApi.updateComment(commentId, content);
      setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch {
      setError(t('tasks.comments.error'));
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await tasksApi.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      setError(t('tasks.comments.error'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <MessageSquare size={14} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}>
          {t('tasks.comments.title')}
        </span>
        {comments.length > 0 && (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-faint)',
            background: 'var(--bg-hover)',
            borderRadius: 'var(--radius-pill)',
            padding: '0 6px',
            fontFamily: 'var(--font-mono)',
          }}>
            {comments.length}
          </span>
        )}
      </div>

      {error && (
        <div style={{
          fontSize: 12, color: '#DC2626',
          background: 'rgba(220,38,38,0.06)',
          borderLeft: '3px solid #DC2626',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
        }}>
          {error}
        </div>
      )}

      {/* Comment list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
          <div style={{
            width: 20, height: 20,
            border: '2px solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : comments.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '20px 0',
          color: 'var(--text-faint)',
        }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>{t('tasks.comments.empty')}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11 }}>{t('tasks.comments.emptySub')}</p>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              userMap={userMap}
              canModify={
                currentUser?.id === comment.authorId || isAdmin
              }
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onTaskClick={onTaskClick}
              members={memberSummaries}
              tasks={projectTasks}
            />
          ))}
        </div>
      )}

      {/* Input */}
      <CommentInput
        onSubmit={handleCreate}
        members={memberSummaries}
        tasks={projectTasks}
      />
    </div>
  );
}