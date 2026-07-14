import { FormEvent, useState } from 'react';
import { LoaderCircle, Send } from 'lucide-react';
import { MentionPicker } from './MentionPicker';

const MAX_COMMENT_LENGTH = 5000;

export function CommentComposer({
  submitting,
  submitLabel,
  placeholder,
  onSubmit,
}: {
  submitting: boolean;
  submitLabel: string;
  placeholder?: string;
  onSubmit: (payload: { content: string; mentionedUserIds: string[] }) => void;
}) {
  const [content, setContent] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    onSubmit({ content, mentionedUserIds });
    setContent('');
    setMentionedUserIds([]);
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <textarea
        className="textarea min-h-[90px]"
        value={content}
        onChange={(event) => setContent(event.target.value.slice(0, MAX_COMMENT_LENGTH))}
        placeholder={placeholder || 'Escribe un comentario...'}
      />
      <MentionPicker selectedUserIds={mentionedUserIds} onChange={setMentionedUserIds} />
      <div className="flex justify-end">
        <button className="btn-primary" disabled={submitting || !content.trim()}>
          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
