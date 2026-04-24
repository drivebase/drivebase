interface FilesWindowErrorsProps {
  messages: string[]
}

export function FilesWindowErrors({ messages }: FilesWindowErrorsProps) {
  return (
    <>
      {messages.map((message, index) => (
        <div
          key={`${index}:${message}`}
          className="mx-3 mt-3 rounded-[var(--radius-sm)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-2.5 py-1.5 text-xs text-[var(--danger)]"
        >
          {message}
        </div>
      ))}
    </>
  )
}
