import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

interface MarkdownMessageProps {
  content: string
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <div className="markdown-content text-sm select-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Párrafos
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
          ),
          // Listas desordenadas
          ul: ({ children }) => (
            <ul className="list-disc ml-4 mb-3 space-y-1">{children}</ul>
          ),
          // Listas ordenadas
          ol: ({ children }) => (
            <ol className="list-decimal ml-4 mb-3 space-y-1">{children}</ol>
          ),
          // Items de lista
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          // Código inline y bloques
          code: ({ className, children, ...props }) => {
            const isInline = !className
            return isInline ? (
              <code
                className="bg-muted/50 dark:bg-muted px-1.5 py-0.5 rounded text-xs font-mono border border-border/50"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className={`${className} block bg-muted/30 dark:bg-muted/50 p-4 rounded-lg overflow-x-auto text-xs font-mono border border-border/30`}
                {...props}
              >
                {children}
              </code>
            )
          },
          // Pre (para bloques de código)
          pre: ({ children }) => (
            <pre className="mb-3 overflow-hidden rounded-lg">{children}</pre>
          ),
          // Encabezados
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold mb-3 mt-4 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold mb-2 mt-3 first:mt-0">
              {children}
            </h4>
          ),
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/30 pl-4 py-1 my-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          // Negritas
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          // Énfasis
          em: ({ children }) => <em className="italic">{children}</em>,
          // Enlaces
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary underline hover:text-primary/80 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          // Línea horizontal
          hr: () => <hr className="my-4 border-t border-border" />,
          // Tablas
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="w-full border-collapse border border-border">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-border">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => <td className="px-3 py-2">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
