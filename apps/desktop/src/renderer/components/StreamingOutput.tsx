interface StreamingOutputProps {
  text: string
}

export default function StreamingOutput({ text }: StreamingOutputProps) {
  if (!text) return null

  return (
    <div className="text-md text-text-primary whitespace-pre-wrap break-words">
      {text}
      <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse-status align-middle" />
    </div>
  )
}
