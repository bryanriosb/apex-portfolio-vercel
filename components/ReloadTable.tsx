'use client'

import React, { MouseEventHandler, useState } from 'react'
import { Button } from './ui/button'
import { RefreshCcw } from 'lucide-react'

interface Props {
  title?: string
  description?: string
  function: MouseEventHandler<HTMLButtonElement>
}

export default function ReloadTable(props: Props) {
  const [loading, setLoading] = useState(false)

  const handleClick = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    setLoading(true)
    props.function(event)
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }
  return (
    <div className="flex justify-between items-center">
      <div className="grid gap-1">
        <h2 className="subtitle">{props?.title}</h2>
        <span className="text-gray-600 text-sm">{props?.description}</span>
      </div>
      <Button
        size="icon"
        variant="outline"
        title="Actualizar"
        onClick={handleClick}
      >
        <RefreshCcw className={loading ? 'animate-spin' : ''} />
      </Button>
    </div>
  )
}
