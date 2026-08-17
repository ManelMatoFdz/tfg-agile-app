import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Pencil, Trash2, MessageSquare, Check, X } from 'lucide-react';
import type { TaskComment, Task, UserSummary } from '../../types';
import { tasksApi } from '../../api/tasks';
import { AssigneeAvatar } from './AssigneePicker';
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

// ── ContentEditable helpers ──────────────────────────────────────────────

const MENTION_SPAN_STYLES: Record<'@' | '#', string> = {
  '@': 'display:inline;padding:1px 6px;font-size:12px;font-weight:600;color:var(--accent);background:var(--accent-muted);border-radius:999px;cursor:default;user-select:all;',
  '#': 'display:inline;padding:1px 6px;font-size:12px;font-weight:600;color:#7C3AED;background:rgba(124,58,237,0.08);border-radius:999px;cursor:default;user-select:all;',
};

function createMentionNode(type: '@' | '#', id: string, label: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.contentEditable = 'false';
  span.dataset.mentionType = type;
  span.dataset.mentionId = id;
  span.dataset.mentionLabel = label;
  span.textContent = `${type === '@' ? '@' : '#'}${label}`;
  span.style.cssText = MENTION_SPAN_STYLES[type];
  return span;
}

function serializeContentEditable(el: HTMLElement): string {
  let result = '';
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? '';
    } else if (node instanceof HTMLElement && node.dataset.mentionType) {
      const type = node.dataset.mentionType as '@' | '#';
      result += insertMentionToken(type, node.dataset.mentionId!, node.dataset.mentionLabel!);
    } else if (node instanceof HTMLBRElement) {
      result += '\n';
    } else if (node instanceof HTMLElement) {
      result += serializeContentEditable(node);
    }
  });
  return result;
}

function deserializeToNodes(content: string, container: HTMLElement): void {
  container.innerHTML = '';
  const parts = parseMentions(content);
  parts.forEach((part) => {
    if (part.type === 'text') {
      container.appendChild(document.createTextNode(part.value));
    } else if (part.type === 'user') {
      container.appendChild(createMentionNode('@', part.id!, part.value));
    } else {
      container.appendChild(createMentionNode('#', part.id!, part.value));
    }
  });
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
  const [sending, setSending] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!initialValue);
  const [autocomplete, setAutocomplete] = useState<{
    type: '@' | '#';
    query: string;
  } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Initialize content for edit mode
  useEffect(() => {
    if (editorRef.current && initialValue && !initializedRef.current) {
      initializedRef.current = true;
      deserializeToNodes(initialValue, editorRef.current);
      setIsEmpty(false);
    }
  }, [initialValue]);

  useEffect(() => {
    if (autoFocus && editorRef.current) {
      editorRef.current.focus();
      const sel = window.getSelection();
      if (sel) {
        sel.selectAllChildren(editorRef.current);
        sel.collapseToEnd();
      }
    }
  }, [autoFocus]);

  const getContent = (): string => {
    if (!editorRef.current) return '';
    return serializeContentEditable(editorRef.current).trim();
  };

  const handleInput = () => {
    if (!editorRef.current) return;

    const content = editorRef.current.textContent?.trim();
    setIsEmpty(!content);

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setAutocomplete(null);
      return;
    }

    const range = sel.getRangeAt(0);
    if (range.startContainer.nodeType !== Node.TEXT_NODE) {
      setAutocomplete(null);
      return;
    }

    const textBefore = (range.startContainer.textContent ?? '').slice(0, range.startOffset);

    const atMatch = textBefore.match(/@([^\s@#]*)$/);
    const hashMatch = textBefore.match(/#([^\s@#]*)$/);

    if (atMatch) {
      setAutocomplete({ type: '@', query: atMatch[1] });
    } else if (hashMatch) {
      setAutocomplete({ type: '#', query: hashMatch[1] });
    } else {
      setAutocomplete(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && autocomplete) {
      e.preventDefault();
      setAutocomplete(null);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !autocomplete) {
      e.preventDefault();
      handleSubmit();
      return;
    }

    // Allow deleting mention spans with Backspace / Delete
    if ((e.key === 'Backspace' || e.key === 'Delete') && editorRef.current) {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!range.collapsed) return; // let default handle selection deletion

      const container = range.startContainer;
      const offset = range.startOffset;

      let mentionToRemove: Element | null = null;

      if (e.key === 'Backspace') {
        if (container.nodeType === Node.TEXT_NODE && offset === 0) {
          // Cursor at start of text node — check previous sibling
          const prev = container.previousSibling;
          if (prev instanceof HTMLElement && prev.dataset.mentionType) {
            mentionToRemove = prev;
          }
        } else if (container === editorRef.current) {
          // Cursor is directly in the editor div between child nodes
          const child = editorRef.current.childNodes[offset - 1];
          if (child instanceof HTMLElement && child.dataset.mentionType) {
            mentionToRemove = child;
          }
        }
      } else {
        // Delete key
        if (container.nodeType === Node.TEXT_NODE && offset === (container.textContent?.length ?? 0)) {
          const next = container.nextSibling;
          if (next instanceof HTMLElement && next.dataset.mentionType) {
            mentionToRemove = next;
          }
        } else if (container === editorRef.current) {
          const child = editorRef.current.childNodes[offset];
          if (child instanceof HTMLElement && child.dataset.mentionType) {
            mentionToRemove = child;
          }
        }
      }

      if (mentionToRemove) {
        e.preventDefault();
        mentionToRemove.remove();
        setIsEmpty(!editorRef.current.textContent?.trim());
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleSelectAutocomplete = (item: AutocompleteItem) => {
    if (!autocomplete || !editorRef.current) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (range.startContainer.nodeType !== Node.TEXT_NODE) return;

    const textNode = range.startContainer as Text;
    const offset = range.startOffset;
    const text = textNode.textContent ?? '';
    const textBefore = text.slice(0, offset);

    const triggerRegex = autocomplete.type === '@' ? /@([^\s@#]*)$/ : /#([^\s@#]*)$/;
    const match = textBefore.match(triggerRegex);
    if (!match) return;

    const triggerStart = offset - match[0].length;
    const textAfterCursor = text.slice(offset);
    const textBeforeTrigger = text.slice(0, triggerStart);

    const parent = textNode.parentNode!;
    const beforeNode = document.createTextNode(textBeforeTrigger);
    const mentionSpan = createMentionNode(autocomplete.type, item.id, item.label);
    const spaceAfter = document.createTextNode('\u00A0' + textAfterCursor);

    parent.insertBefore(beforeNode, textNode);
    parent.insertBefore(mentionSpan, textNode);
    parent.insertBefore(spaceAfter, textNode);
    parent.removeChild(textNode);

    // Position cursor after the space
    const newRange = document.createRange();
    newRange.setStart(spaceAfter, 1);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    setAutocomplete(null);
    setIsEmpty(false);
    editorRef.current.focus();
  };

  const handleSubmit = async () => {
    const content = getContent();
    if (!content || sending) return;
    setSending(true);
    try {
      await onSubmit(content);
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
        setIsEmpty(true);
      }
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
  const hasContent = !isEmpty;

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: isEditing ? 'flex-start' : 'flex-end',
        }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          {isEmpty && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 12,
                fontSize: 13,
                color: 'var(--text-faint)',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              {t('tasks.comments.placeholder')}
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            style={{
              padding: '8px 12px',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
              color: 'var(--text)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              outline: 'none',
              minHeight: isEditing ? 70 : 56,
              maxHeight: 160,
              overflowY: 'auto',
              lineHeight: 1.6,
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              transition: 'border-color 150ms',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-text)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            onClick={handleSubmit}
            disabled={!hasContent || sending}
            title={isEditing ? t('common.save') : t('tasks.comments.send')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: hasContent ? 'var(--accent-text)' : 'var(--bg-hover)',
              color: hasContent ? '#fff' : 'var(--text-faint)',
              cursor: hasContent && !sending ? 'pointer' : 'not-allowed',
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
                color: 'var(--accent-text)',
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
  readOnly?: boolean;
  onTaskClick?: (taskId: string) => void;
}

export default function TaskComments({
  taskId,
  projectId,
  members,
  userMap,
  isAdmin,
  readOnly = false,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
            borderTopColor: 'var(--accent-text)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : comments.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '28px 0',
          color: 'var(--text-faint)',
        }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>{t('tasks.comments.empty')}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11 }}>{t('tasks.comments.emptySub')}</p>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              userMap={userMap}
              canModify={
                !readOnly && (currentUser?.id === comment.authorId || isAdmin)
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

      {/* Input — hidden in readOnly mode */}
      {!readOnly && (
        <CommentInput
          onSubmit={handleCreate}
          members={memberSummaries}
          tasks={projectTasks}
        />
      )}
    </div>
  );
}