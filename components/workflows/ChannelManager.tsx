'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ChannelManagerProps {
  channels: string[]
  onChange: (channels: string[]) => void
}

export function ChannelManager({ channels, onChange }: ChannelManagerProps) {
  const [newChannel, setNewChannel] = useState('')

  const handleAdd = () => {
    const trimmed = newChannel.trim()
    if (trimmed && !channels.includes(trimmed)) {
      onChange([...channels, trimmed])
      setNewChannel('')
    }
  }

  const handleRemove = (channel: string) => {
    onChange(channels.filter((c) => c !== channel))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">
        Channels
      </label>
      <div className="flex gap-1">
        <Input
          value={newChannel}
          onChange={(e) => setNewChannel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nuevo channel..."
          className="h-7 text-xs rounded-none flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0 rounded-none"
          onClick={handleAdd}
          disabled={!newChannel.trim()}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      {channels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {channels.map((ch) => (
            <Badge
              key={ch}
              variant="outline"
              className="text-xs gap-1 pr-1"
            >
              {ch}
              <button
                type="button"
                onClick={() => handleRemove(ch)}
                className="ml-0.5 rounded-none hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
