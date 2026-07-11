'use client'

import { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { rust } from '@codemirror/lang-rust'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

export type CodeEditorLanguage = 'javascript' | 'rust' | 'json'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language: CodeEditorLanguage
  height?: string
  placeholder?: string
  readOnly?: boolean
  className?: string
}

export function CodeEditor({
  value,
  onChange,
  language,
  height = '200px',
  placeholder,
  readOnly = false,
  className,
}: CodeEditorProps) {
  const { resolvedTheme } = useTheme()

  const extensions = useMemo(() => {
    switch (language) {
      case 'javascript':
        return [javascript()]
      case 'rust':
        return [rust()]
      case 'json':
        return [json()]
    }
  }, [language])

  return (
    <div className={cn('overflow-hidden border border-input text-sm', className)}>
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        height={height}
        placeholder={placeholder}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: !readOnly,
          autocompletion: true,
        }}
      />
    </div>
  )
}
