'use client'

import './editor-styles.css'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEffect, useState, useRef } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ImageInsertDialog } from './ImageInsertDialog'
import { HtmlEditDialog } from './HtmlEditDialog'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Highlighter,
  Link2,
  Table as TableIcon,
  Type,
  ImageIcon,
  Rows,
  Columns,
  Trash2,
  Plus,
  PaintBucket,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Code,
  Check,
  Copy,
  ClipboardPaste,
  Maximize,
  Minimize,
} from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import { Extension } from '@tiptap/core'

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) =>
              element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: any) => {
          return chain().setMark('textStyle', { fontSize }).run()
        },
      unsetFontSize:
        () =>
        ({ chain }: any) => {
          return chain()
            .setMark('textStyle', { fontSize: null })
            .removeEmptyTextStyle()
            .run()
        },
    }
  },
})

const StylePreserver = Extension.create({
  name: 'stylePreserver',
  addGlobalAttributes() {
    return [
      {
        types: [
          'paragraph',
          'heading',
          'image',
          'blockquote',
          'bulletList',
          'orderedList',
          'listItem',
        ],
        attributes: {
          style: {
            default: null,
            parseHTML: (element) => element.getAttribute('style'),
            renderHTML: (attributes) => {
              if (!attributes.style) return {}
              return { style: attributes.style }
            },
          },
        },
      },
    ]
  },
})

interface EmailEditorProps {
  subject: string
  content: string
  onSubjectChange: (subject: string) => void
  onContentChange: (content: string) => void
  onEditorReady: (editor: any) => void
  businessId: string
}

export function EmailEditor({
  subject,
  content,
  onSubjectChange,
  onContentChange,
  onEditorReady,
  businessId,
}: EmailEditorProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [htmlDialogOpen, setHtmlDialogOpen] = useState(false)
  const editor = useEditor({
    extensions: [
      StarterKit,
      FontSize,
      StylePreserver,
      Placeholder.configure({
        placeholder: 'Escribe el contenido del correo aquí...',
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'tiptap-table',
        },
      }).extend({
        addAttributes() {
          return {
            class: {
              default: 'tiptap-table',
            },
            style: {
              default: null,
              parseHTML: (element) => element.getAttribute('style'),
              renderHTML: (attributes) => {
                if (!attributes.style) return {}
                return { style: attributes.style }
              },
            },
          }
        },
      }),
      TableRow.extend({
        addAttributes() {
          return {
            style: {
              default: null,
              parseHTML: (element) => element.getAttribute('style'),
              renderHTML: (attributes) => {
                if (!attributes.style) return {}
                return { style: attributes.style }
              },
            },
          }
        },
      }),
      TableCell.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: (element) => element.getAttribute('style'),
              renderHTML: (attributes) => {
                if (!attributes.style) return {}
                return { style: attributes.style }
              },
            },
            backgroundColor: {
              default: null,
              parseHTML: (element) => element.style.backgroundColor,
              renderHTML: (attributes) => {
                if (!attributes.backgroundColor) {
                  return {}
                }
                return {
                  style: `background-color: ${attributes.backgroundColor}`,
                }
              },
            },
            borderStyle: {
              default: null,
              parseHTML: (element) => element.style.borderStyle,
              renderHTML: (attributes) => {
                if (!attributes.borderStyle) return {}
                return { style: `border-style: ${attributes.borderStyle}` }
              },
            },
            borderWidth: {
              default: null,
              parseHTML: (element) => element.style.borderWidth,
              renderHTML: (attributes) => {
                if (!attributes.borderWidth) return {}
                return { style: `border-width: ${attributes.borderWidth}` }
              },
            },
            borderColor: {
              default: null,
              parseHTML: (element) => element.style.borderColor,
              renderHTML: (attributes) => {
                if (!attributes.borderColor) return {}
                return { style: `border-color: ${attributes.borderColor}` }
              },
            },
          }
        },
      }),
      TableHeader.extend({
        addAttributes() {
          return {
            style: {
              default: null,
              parseHTML: (element) => element.getAttribute('style'),
              renderHTML: (attributes) => {
                if (!attributes.style) return {}
                return { style: attributes.style }
              },
            },
          }
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      TextStyle.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: (element) => element.getAttribute('style'),
              renderHTML: (attributes) => {
                if (!attributes.style) return {}
                return { style: attributes.style }
              },
            },
          }
        },
      }),
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
      }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl dark:prose-invert m-5 focus:outline-none min-h-[500px]',
      },
    },
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML())
    },
    onCreate: ({ editor }) => {
      onEditorReady(editor)
    },
  })

  const onHtmlSave = (newHtml: string) => {
    editor?.commands.setContent(newHtml)
    onContentChange(newHtml)
  }

  const onImageInsert = (url: string) => {
    editor?.chain().focus().setImage({ src: url }).run()
  }

  const editorRef = useRef<HTMLDivElement>(null)
  const [tableMenuPos, setTableMenuPos] = useState<{
    top: number
    left: number
  } | null>(null)

  useEffect(() => {
    if (!editor) return

    const updateMenuPos = () => {
      if (!editor.isActive('table')) {
        setTableMenuPos(null)
        return
      }

      const { selection } = editor.state
      const { view } = editor

      // Safe DOM search
      let element = view.domAtPos(selection.from).node as HTMLElement
      if (element.nodeType === 3 && element.parentElement) {
        element = element.parentElement
      }
      const tableElement = element.closest('table')

      if (tableElement && editorRef.current) {
        const tableRect = tableElement.getBoundingClientRect()
        const editorRect = editorRef.current.getBoundingClientRect()

        // Position above the table
        setTableMenuPos({
          top: tableRect.top - editorRect.top - 40,
          left: tableRect.left - editorRect.left,
        })
      }
    }

    editor.on('transaction', updateMenuPos)
    editor.on('selectionUpdate', updateMenuPos)

    // Initial check
    updateMenuPos()

    return () => {
      editor.off('transaction', updateMenuPos)
      editor.off('selectionUpdate', updateMenuPos)
    }
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 shadow-sm border dark:border-gray-800 mx-auto max-w-4xl my-8 min-h-[800px]">
      {/* Subject Line */}
      <div className="border-b dark:border-gray-800 px-8 py-6">
        <Input
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="Asunto del correo"
          className="text-2xl font-bold border-none px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 bg-transparent dark:text-white"
        />
      </div>

      {/* Content Wrapper for positioning */}
      <div className="relative flex-1 flex flex-col" ref={editorRef}>
        {/* Custom Table Menu */}
        {tableMenuPos && (
          <div
            className="absolute z-50 flex bg-white dark:bg-gray-900 border dark:border-gray-700 shadow-lg rounded-md p-1 gap-1"
            style={{
              top: `${tableMenuPos.top}px`,
              left: `${tableMenuPos.left}px`,
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 p-0"
              title="Eliminar tabla"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 border-b dark:border-gray-800 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 sticky top-[60px] z-10 backdrop-blur-sm flex-wrap">
          {/* Undo/Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            icon={Undo}
            tooltip="Deshacer"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            icon={Redo}
            tooltip="Rehacer"
          />

          <div className="w-px h-6 bg-border mx-1" />

          {/* Heading Levels */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setParagraph().run()}
            isActive={editor.isActive('paragraph')}
            icon={Type}
            tooltip="Párrafo normal"
          />
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            isActive={editor.isActive('heading', { level: 1 })}
            icon={Heading1}
            tooltip="Título 1"
          />
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            isActive={editor.isActive('heading', { level: 2 })}
            icon={Heading2}
            tooltip="Título 2"
          />
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            isActive={editor.isActive('heading', { level: 3 })}
            icon={Heading3}
            tooltip="Título 3"
          />

          {/* Font Size */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-14 gap-1 px-1">
                <span className="text-xs font-medium truncate">
                  {editor.getAttributes('textStyle').fontSize
                    ? editor.getAttributes('textStyle').fontSize
                    : 'Auto'}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {[
                '6px',
                '8px',
                '10px',
                '11px',
                '12px',
                '14px',
                '16px',
                '18px',
                '20px',
                '24px',
                '30px',
                '36px',
              ].map((size) => (
                <DropdownMenuItem
                  key={size}
                  onClick={() => editor.chain().focus().setFontSize(size).run()}
                  className="justify-between"
                >
                  <span>{size}</span>
                  {editor.getAttributes('textStyle').fontSize === size && (
                    <Check className="h-4 w-4" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => editor.chain().focus().unsetFontSize().run()}
              >
                <span>Auto</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Text Formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            icon={Bold}
            tooltip="Negrita"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            icon={Italic}
            tooltip="Cursiva"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            icon={UnderlineIcon}
            tooltip="Subrayado"
          />

          <div className="w-px h-6 bg-border mx-1" />

          {/* Text Color */}
          <input
            type="color"
            onChange={(e) =>
              editor.chain().focus().setColor(e.target.value).run()
            }
            value={editor.getAttributes('textStyle').color || '#000000'}
            className="h-7 w-7 cursor-pointer border dark:border-gray-700"
            title="Color de texto"
          />

          {/* Highlight Color */}
          <input
            type="color"
            onChange={(e) =>
              editor
                .chain()
                .focus()
                .toggleHighlight({ color: e.target.value })
                .run()
            }
            className="h-7 w-7 cursor-pointer border dark:border-gray-700"
            title="Color de fondo"
          />

          <div className="w-px h-6 bg-border mx-1" />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            icon={List}
            tooltip="Lista de puntos"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            icon={ListOrdered}
            tooltip="Lista numerada"
          />

          <div className="w-px h-6 bg-border mx-1" />

          {/* Text Alignment */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            icon={AlignLeft}
            tooltip="Alinear a la izquierda"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            icon={AlignCenter}
            tooltip="Centrar"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            icon={AlignRight}
            tooltip="Alinear a la derecha"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            isActive={editor.isActive({ textAlign: 'justify' })}
            icon={AlignJustify}
            tooltip="Justificar"
          />

          <div className="w-px h-6 bg-border mx-1" />

          {/* Quote */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            icon={Quote}
            tooltip="Cita"
          />

          <div className="w-px h-6 bg-border mx-1" />

          {/* Link */}
          <ToolbarButton
            onClick={() => {
              const url = window.prompt('Ingresa la URL:')
              if (url) {
                editor.chain().focus().setLink({ href: url }).run()
              }
            }}
            isActive={editor.isActive('link')}
            icon={Link2}
            tooltip="Insertar enlace"
          />

          {/* Table - Insert Button (Menu in Context Menu now) */}
          <ToolbarButton
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            icon={TableIcon}
            tooltip="Insertar tabla"
            isActive={editor.isActive('table')}
          />

          <div className="w-px h-6 bg-border mx-1" />

          {/* Image */}
          <ToolbarButton
            onClick={() => setImageDialogOpen(true)}
            icon={ImageIcon}
            tooltip="Insertar imagen"
          />

          <div className="w-px h-6 bg-border mx-1" />

          {/* Raw HTML */}
          <ToolbarButton
            onClick={() => setHtmlDialogOpen(true)}
            icon={Code}
            tooltip="Editar HTML"
            className="text-blue-600 dark:text-blue-400"
          />
        </div>

        {/* Editor Content */}
        {/* Editor Content with Context Menu */}
        <ContextMenu>
          <ContextMenuTrigger className="flex-1 flex flex-col">
            <div
              className="flex-1 p-8 cursor-text"
              onClick={() => editor.chain().focus().run()}
            >
              <EditorContent editor={editor} />
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent className="w-64">
            {editor.isActive('table') ? (
              <>
                <ContextMenuLabel>Opciones de Tabla</ContextMenuLabel>
                <ContextMenuSeparator />

                {/* Insert Options */}
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Insertar</span>
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-48">
                    <ContextMenuItem
                      onClick={() =>
                        editor.chain().focus().addRowBefore().run()
                      }
                    >
                      <ArrowUp className="mr-2 h-4 w-4" />
                      <span>Fila Arriba</span>
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => editor.chain().focus().addRowAfter().run()}
                    >
                      <ArrowDown className="mr-2 h-4 w-4" />
                      <span>Fila Abajo</span>
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() =>
                        editor.chain().focus().addColumnBefore().run()
                      }
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      <span>Columna Izquierda</span>
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() =>
                        editor.chain().focus().addColumnAfter().run()
                      }
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      <span>Columna Derecha</span>
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>

                {/* Delete Options */}
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Eliminar</span>
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-48">
                    <ContextMenuItem
                      onClick={() => editor.chain().focus().deleteRow().run()}
                    >
                      <Rows className="mr-2 h-4 w-4" />
                      <span>Eliminar Fila</span>
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() =>
                        editor.chain().focus().deleteColumn().run()
                      }
                    >
                      <Columns className="mr-2 h-4 w-4" />
                      <span>Eliminar Columna</span>
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => editor.chain().focus().deleteTable().run()}
                      className="text-red-500 focus:text-red-500"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Eliminar Tabla</span>
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>

                <ContextMenuSeparator />

                {/* Cell Styles */}
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <PaintBucket className="mr-2 h-4 w-4" />
                    <span>Estilo de Celda</span>
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-56">
                    <ContextMenuLabel>Color de Fondo</ContextMenuLabel>
                    <div className="p-2">
                      <div className="grid grid-cols-5 gap-1 mb-2">
                        {[
                          '#ffffff',
                          '#f3f4f6',
                          '#fee2e2',
                          '#fef3c7',
                          '#dcfce7',
                          '#dbeafe',
                          '#f3e8ff',
                        ].map((color) => (
                          <button
                            key={color}
                            className="w-6 h-6 rounded border shadow-sm hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            onClick={() =>
                              editor
                                .chain()
                                .focus()
                                .setCellAttribute('backgroundColor', color)
                                .run()
                            }
                            title={color}
                          />
                        ))}
                        <button
                          className="w-6 h-6 rounded border shadow-sm flex items-center justify-center text-red-500 hover:bg-red-50"
                          onClick={() =>
                            editor
                              .chain()
                              .focus()
                              .setCellAttribute('backgroundColor', null)
                              .run()
                          }
                          title="Sin fondo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                          Personalizado:
                        </span>
                        <input
                          type="color"
                          onChange={(e) =>
                            editor
                              .chain()
                              .focus()
                              .setCellAttribute(
                                'backgroundColor',
                                e.target.value
                              )
                              .run()
                          }
                          className="flex-1 h-6 cursor-pointer"
                        />
                      </div>
                    </div>
                  </ContextMenuSubContent>
                </ContextMenuSub>

                {/* Border Options */}
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <div className="mr-2 h-4 w-4 border border-current rounded-[1px] flex items-center justify-center">
                      <div className="h-2 w-2 bg-current opacity-20" />
                    </div>
                    <span>Bordes</span>
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-48">
                    <ContextMenuItem
                      onClick={() => {
                        const currentClass =
                          editor.getAttributes('table').class || ''
                        const newClass = currentClass.includes(
                          'table-no-borders'
                        )
                          ? currentClass
                              .replace(' table-no-borders', '')
                              .replace('table-no-borders', '')
                          : `${currentClass} table-no-borders`.trim()
                        editor
                          .chain()
                          .focus()
                          .updateAttributes('table', { class: newClass })
                          .run()
                      }}
                      className="justify-between"
                    >
                      <span>
                        {editor
                          .getAttributes('table')
                          .class?.includes('table-no-borders')
                          ? 'Mostrar Todos (Global)'
                          : 'Ocultar Todos (Global)'}
                      </span>
                      {editor
                        .getAttributes('table')
                        .class?.includes('table-no-borders') && (
                        <Check className="h-4 w-4" />
                      )}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuLabel>Selección Actual</ContextMenuLabel>
                    <ContextMenuItem
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .setCellAttribute('borderStyle', 'hidden')
                          .setCellAttribute('borderWidth', null)
                          .setCellAttribute('borderColor', null)
                          .run()
                      }}
                    >
                      <span>Sin Borde</span>
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .setCellAttribute('borderStyle', 'solid')
                          .setCellAttribute('borderWidth', '1px')
                          .setCellAttribute('borderColor', '#d1d5db')
                          .run()
                      }}
                    >
                      <span>Borde Normal</span>
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
              </>
            ) : (
              <>
                <ContextMenuItem disabled>
                  <span className="text-xs text-muted-foreground">
                    Opciones generales (WIP)
                  </span>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => editor.chain().focus().unsetAllMarks().run()}
                >
                  Limpiar Formato
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
      </div>

      <ImageInsertDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        onInsert={onImageInsert}
        businessId={businessId}
      />

      <HtmlEditDialog
        open={htmlDialogOpen}
        onOpenChange={setHtmlDialogOpen}
        initialContent={editor.getHTML()}
        onSave={onHtmlSave}
      />
    </div>
  )
}

function ToolbarButton({
  onClick,
  disabled,
  isActive,
  icon: Icon,
  tooltip,
  size = 'default',
}: any) {
  return (
    <Button
      variant="ghost"
      size={size === 'sm' ? 'icon' : 'sm'}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-8 w-8',
        isActive && 'bg-muted text-foreground',
        size === 'sm' && 'h-6 w-6'
      )}
      title={tooltip}
    >
      <Icon className={cn('h-4 w-4', size === 'sm' && 'h-3 w-3')} />
    </Button>
  )
}
