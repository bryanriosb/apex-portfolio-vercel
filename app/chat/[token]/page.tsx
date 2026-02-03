import { AgentChatWidget } from '@/components/agent-chat'

interface ChatPageProps {
  params: Promise<{ token: string }>
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { token } = await params

  return (
    <main className="h-screen overflow-hidden bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto flex h-full w-full max-w-lg flex-col">
        <AgentChatWidget token={token} className="h-full" />
      </div>
    </main>
  )
}
