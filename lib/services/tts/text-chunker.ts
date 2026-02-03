const FIRST_CHUNK_MIN = 30
const FIRST_CHUNK_MAX = 80
const MIN_CHUNK_SIZE = 100
const MAX_CHUNK_SIZE = 200
const SENTENCE_END = /[.!?]/
const CLAUSE_BREAK = /[;:,]/
const BULLET_REGEX = /[•◦▪▸►→·]/g
const SPECIAL_CHARS_REGEX = /[*#_~`\[\](){}|\\<>^+=@$%&\-—–]/g
const MULTIPLE_SPACES_REGEX = /\s+/g
const EMOJI_REGEX =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu

export interface TextChunkerCallbacks {
  onChunk: (chunk: string) => void
  onComplete?: () => void
}

export class TextChunkerService {
  private buffer = ''
  private callbacks: TextChunkerCallbacks
  private isFirstChunk = true

  constructor(callbacks: TextChunkerCallbacks) {
    this.callbacks = callbacks
  }

  private sanitizeText(text: string): string {
    return text
      .replace(EMOJI_REGEX, '')
      .replace(BULLET_REGEX, '...')
      .replace(SPECIAL_CHARS_REGEX, '')
      .replace(MULTIPLE_SPACES_REGEX, ' ')
  }

  private addTransition(chunk: string): string {
    const lastChar = chunk[chunk.length - 1]
    if (SENTENCE_END.test(lastChar)) return chunk
    if (chunk.endsWith('...')) return chunk
    return chunk + '...'
  }

  private findSentenceEnd(text: string, minPos: number, maxPos: number): number {
    const searchArea = text.slice(0, maxPos)
    for (let i = Math.min(searchArea.length - 1, maxPos); i >= minPos; i--) {
      if (SENTENCE_END.test(searchArea[i])) {
        return i + 1
      }
    }
    return -1
  }

  private findClauseBreak(text: string, minPos: number, maxPos: number): number {
    const searchArea = text.slice(0, maxPos)
    for (let i = Math.min(searchArea.length - 1, maxPos); i >= minPos; i--) {
      if (CLAUSE_BREAK.test(searchArea[i])) {
        return i + 1
      }
    }
    return -1
  }

  private findWordBreak(text: string, minPos: number, maxPos: number): number {
    const searchArea = text.slice(0, maxPos)
    const spaceIndex = searchArea.lastIndexOf(' ')
    return spaceIndex >= minPos ? spaceIndex + 1 : -1
  }

  private findBreakPoint(text: string, min: number, max: number): number {
    if (text.length <= max) {
      const sentenceEnd = this.findSentenceEnd(text, min, text.length)
      if (sentenceEnd > 0) return sentenceEnd
      return -1
    }

    let breakPoint = this.findSentenceEnd(text, min, max)
    if (breakPoint > 0) return breakPoint

    breakPoint = this.findClauseBreak(text, min, max)
    if (breakPoint > 0) return breakPoint

    breakPoint = this.findWordBreak(text, min, max)
    if (breakPoint > 0) return breakPoint

    return max
  }

  private processBuffer(): void {
    while (true) {
      const min = this.isFirstChunk ? FIRST_CHUNK_MIN : MIN_CHUNK_SIZE
      const max = this.isFirstChunk ? FIRST_CHUNK_MAX : MAX_CHUNK_SIZE

      if (this.buffer.length < min) break

      const breakPoint = this.findBreakPoint(this.buffer, min, max)
      if (breakPoint < 0) break

      const chunk = this.buffer.slice(0, breakPoint).trim()
      this.buffer = this.buffer.slice(breakPoint).trimStart()

      if (chunk.length >= (this.isFirstChunk ? 15 : 30)) {
        this.callbacks.onChunk(this.addTransition(chunk))
        this.isFirstChunk = false
      } else if (chunk.length > 0) {
        this.buffer = chunk + ' ' + this.buffer
        break
      }
    }
  }

  append(text: string): void {
    const sanitized = this.sanitizeText(text)
    if (!sanitized) return
    this.buffer += sanitized
    this.processBuffer()
  }

  flush(): void {
    if (this.buffer.trim().length > 0) {
      const remaining = this.buffer.trim()
      if (remaining.length > 10) {
        this.callbacks.onChunk(remaining)
      }
      this.buffer = ''
    }
    this.callbacks.onComplete?.()
  }

  reset(): void {
    this.buffer = ''
    this.isFirstChunk = true
  }

  getBufferLength(): number {
    return this.buffer.length
  }
}

export function createTextChunkGenerator(
  textStream: AsyncIterable<string>
): AsyncGenerator<string, void, unknown> {
  return (async function* () {
    let buffer = ''
    let isFirst = true

    const sanitize = (text: string): string => {
      return text
        .replace(EMOJI_REGEX, '')
        .replace(BULLET_REGEX, '...')
        .replace(SPECIAL_CHARS_REGEX, '')
        .replace(MULTIPLE_SPACES_REGEX, ' ')
    }

    const addTransition = (chunk: string): string => {
      const lastChar = chunk[chunk.length - 1]
      if (SENTENCE_END.test(lastChar)) return chunk
      if (chunk.endsWith('...')) return chunk
      return chunk + '...'
    }

    const findBreak = (text: string, min: number, max: number): number => {
      if (text.length <= max) {
        for (let i = text.length - 1; i >= min; i--) {
          if (SENTENCE_END.test(text[i])) return i + 1
        }
        return -1
      }

      const search = text.slice(0, max)
      for (let i = search.length - 1; i >= min; i--) {
        if (SENTENCE_END.test(search[i])) return i + 1
      }
      for (let i = search.length - 1; i >= min; i--) {
        if (CLAUSE_BREAK.test(search[i])) return i + 1
      }
      const space = search.lastIndexOf(' ')
      if (space >= min) return space + 1
      return max
    }

    for await (const text of textStream) {
      buffer += sanitize(text)

      while (true) {
        const min = isFirst ? FIRST_CHUNK_MIN : MIN_CHUNK_SIZE
        const max = isFirst ? FIRST_CHUNK_MAX : MAX_CHUNK_SIZE

        if (buffer.length < min) break

        const breakPoint = findBreak(buffer, min, max)
        if (breakPoint < 0) break

        const chunk = buffer.slice(0, breakPoint).trim()
        buffer = buffer.slice(breakPoint).trimStart()

        if (chunk.length >= (isFirst ? 15 : 30)) {
          yield addTransition(chunk)
          isFirst = false
        } else if (chunk.length > 0) {
          buffer = chunk + ' ' + buffer
          break
        }
      }
    }

    if (buffer.trim().length > 10) {
      yield buffer.trim()
    }
  })()
}
