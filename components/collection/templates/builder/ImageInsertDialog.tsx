'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Upload, Link as LinkIcon, Loader2, Image as ImageIcon } from 'lucide-react'
import { uploadCollectionImageAction, listCollectionImagesAction } from '@/lib/actions/collection/image-storage'
import { toast } from 'sonner'

interface ImageInsertDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onInsert: (imageUrl: string) => void
    businessId: string
}

export function ImageInsertDialog({ open, onOpenChange, onInsert, businessId }: ImageInsertDialogProps) {
    const [selectedImage, setSelectedImage] = useState<string>('')
    const [isUploading, setIsUploading] = useState(false)
    const [existingImages, setExistingImages] = useState<string[]>([])
    const [isLoadingImages, setIsLoadingImages] = useState(false)
    const [customUrl, setCustomUrl] = useState('')
    const [activeTab, setActiveTab] = useState('upload')

    // Load existing images when dialog opens
    useEffect(() => {
        if (open && businessId) {
            loadExistingImages()
        }
    }, [open, businessId])

    const loadExistingImages = async () => {
        setIsLoadingImages(true)
        try {
            const result = await listCollectionImagesAction(businessId)
            if (result.success && result.images) {
                setExistingImages(result.images)
            } else {
                toast.error(result.error || 'Error al cargar imágenes')
            }
        } catch (error) {
            console.error('Error loading images:', error)
            toast.error('Error al cargar imágenes')
        } finally {
            setIsLoadingImages(false)
        }
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        await uploadImage(file)
    }

    const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()

        const file = event.dataTransfer.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('El archivo debe ser una imagen')
            return
        }

        await uploadImage(file)
    }, [])

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
    }, [])

    const uploadImage = async (file: File) => {
        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('businessId', businessId)

            const result = await uploadCollectionImageAction(formData)

            if (result.success && result.url) {
                setSelectedImage(result.url)
                toast.success('Imagen subida exitosamente')
                // Reload images list
                await loadExistingImages()
            } else {
                toast.error(result.error || 'Error al subir imagen')
            }
        } catch (error) {
            console.error('Error uploading image:', error)
            toast.error('Error al subir imagen')
        } finally {
            setIsUploading(false)
        }
    }

    const handleInsert = () => {
        let imageUrl = ''

        if (activeTab === 'upload' && selectedImage) {
            imageUrl = selectedImage
        } else if (activeTab === 'library' && selectedImage) {
            imageUrl = selectedImage
        } else if (activeTab === 'url' && customUrl) {
            imageUrl = customUrl
        }

        if (!imageUrl) {
            toast.error('Por favor selecciona o sube una imagen')
            return
        }

        onInsert(imageUrl)
        handleClose()
    }

    const handleClose = () => {
        setSelectedImage('')
        setCustomUrl('')
        setActiveTab('upload')
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl dark:bg-gray-950 dark:border-gray-800">
                <DialogHeader>
                    <DialogTitle className="dark:text-white">Insertar Imagen</DialogTitle>
                    <DialogDescription className="dark:text-gray-400">
                        Sube una nueva imagen, selecciona una existente o ingresa una URL
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 dark:bg-gray-900">
                        <TabsTrigger value="upload" className="dark:data-[state=active]:bg-gray-800">
                            <Upload className="h-4 w-4 mr-2" />
                            Subir Nueva
                        </TabsTrigger>
                        <TabsTrigger value="library" className="dark:data-[state=active]:bg-gray-800">
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Galería
                        </TabsTrigger>
                        <TabsTrigger value="url" className="dark:data-[state=active]:bg-gray-800">
                            <LinkIcon className="h-4 w-4 mr-2" />
                            URL
                        </TabsTrigger>
                    </TabsList>

                    {/* Upload Tab */}
                    <TabsContent value="upload" className="space-y-4 mt-4">
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            className="border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 text-center hover:border-gray-400 dark:hover:border-gray-600 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-900/50"
                        >
                            <input
                                type="file"
                                id="image-upload"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                onChange={handleFileChange}
                                className="hidden"
                                disabled={isUploading}
                            />
                            <label htmlFor="image-upload" className="cursor-pointer">
                                {isUploading ? (
                                    <div className="flex flex-col items-center">
                                        <Loader2 className="h-12 w-12 text-gray-400 dark:text-gray-600 animate-spin mb-3" />
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Subiendo imagen...</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <Upload className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                            Arrastra una imagen aquí o haz clic para seleccionar
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500">
                                            JPG, PNG, GIF, WEBP (máx. 5MB)
                                        </p>
                                    </div>
                                )}
                            </label>
                        </div>

                        {selectedImage && (
                            <div className="border dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
                                <p className="text-sm font-medium mb-2 dark:text-white">Vista previa:</p>
                                <img
                                    src={selectedImage}
                                    alt="Preview"
                                    className="max-w-full h-auto max-h-64 mx-auto border dark:border-gray-700"
                                />
                            </div>
                        )}
                    </TabsContent>

                    {/* Library Tab */}
                    <TabsContent value="library" className="space-y-4 mt-4">
                        {isLoadingImages ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-600" />
                            </div>
                        ) : existingImages.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                <p>No hay imágenes disponibles</p>
                                <p className="text-sm mt-1">Sube tu primera imagen en la pestaña "Subir Nueva"</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-96">
                                <div className="grid grid-cols-3 gap-3 p-2">
                                    {existingImages.map((imageUrl, index) => (
                                        <div
                                            key={index}
                                            onClick={() => setSelectedImage(imageUrl)}
                                            className={`cursor-pointer border-2 p-1 hover:border-blue-500 dark:hover:border-blue-400 transition-colors ${selectedImage === imageUrl
                                                ? 'border-blue-500 dark:border-blue-400'
                                                : 'border-gray-200 dark:border-gray-800'
                                                }`}
                                        >
                                            <img
                                                src={imageUrl}
                                                alt={`Image ${index + 1}`}
                                                className="w-full h-32 object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </TabsContent>

                    {/* URL Tab */}
                    <TabsContent value="url" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="image-url" className="dark:text-gray-300">URL de la imagen</Label>
                            <Input
                                id="image-url"
                                type="url"
                                placeholder="https://ejemplo.com/imagen.jpg"
                                value={customUrl}
                                onChange={(e) => setCustomUrl(e.target.value)}
                                className="dark:bg-gray-900 dark:border-gray-800 dark:text-white"
                            />
                        </div>

                        {customUrl && (
                            <div className="border dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
                                <p className="text-sm font-medium mb-2 dark:text-white">Vista previa:</p>
                                <img
                                    src={customUrl}
                                    alt="Preview"
                                    className="max-w-full h-auto max-h-64 mx-auto border dark:border-gray-700"
                                    onError={(e) => {
                                        e.currentTarget.src = ''
                                        e.currentTarget.alt = 'Error al cargar imagen'
                                    }}
                                />
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 mt-4">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        className="dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleInsert}
                        disabled={!selectedImage && !customUrl}
                        className="dark:bg-primary dark:hover:bg-primary/80"
                    >
                        Insertar Imagen
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
