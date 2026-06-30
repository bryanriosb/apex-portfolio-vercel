'use client';

import React, { useEffect, useState } from 'react';
import { getPresignedAttachmentsAction } from '@/lib/actions/automation';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, FileText, Image as ImageIcon, Maximize2, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { useRef } from 'react';

function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageLoading, setImageLoading] = useState(true);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = -e.deltaY * 0.001;
      setScale(s => Math.min(Math.max(0.1, s + zoomFactor), 5));
    };

    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    setPosition(p => ({ x: p.x + dx, y: p.y + dy }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div
      ref={wrapperRef}
      className="relative w-full h-full overflow-hidden bg-transparent cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.min(5, s + 0.2))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.max(0.1, s - 0.2))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center origin-center transition-transform duration-75"
        style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
      >
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Spinner className="size-8 text-primary" />
          </div>
        )}
        <img
          src={src}
          alt={alt}
          className={`max-w-none min-w-full min-h-full object-contain pointer-events-none transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setImageLoading(false)}
        />
      </div>
    </div>
  );
}

interface AttachmentViewerProps {
  paths: string[];
}

export function AttachmentViewer({ paths }: AttachmentViewerProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setMediaLoading(true);
  }, [currentIndex, urls]);

  useEffect(() => {
    async function loadUrls() {
      if (!paths || paths.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const presigned = await getPresignedAttachmentsAction(paths);
        setUrls(presigned);
      } catch (error) {
        console.error("Error fetching presigned URLs", error);
      } finally {
        setLoading(false);
      }
    }
    loadUrls();
  }, [paths]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4 border border-border bg-card rounded-none">
        <Spinner className="size-8" />
        <span className="text-sm text-muted-foreground">Cargando archivos adjuntos...</span>
      </div>
    );
  }

  if (!paths || paths.length === 0) {
    return null;
  }

  const currentPath = paths[currentIndex];
  const currentUrl = urls[currentPath];
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(currentPath.split('?')[0]);
  const isPdf = /\.pdf$/i.test(currentPath.split('?')[0]);

  const handleNext = () => setCurrentIndex((i) => (i + 1) % paths.length);
  const handlePrev = () => setCurrentIndex((i) => (i - 1 + paths.length) % paths.length);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between bg-muted/20 p-2 border border-border rounded-none">
        <div className="flex items-center gap-2">
          {isImage ? <ImageIcon className="size-4 text-muted-foreground" /> : <FileText className="size-4 text-muted-foreground" />}
          <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-[400px]">
            {currentPath.split('/').pop()}
          </span>
          <span className="text-xs text-muted-foreground ml-2">
            ({currentIndex + 1} de {paths.length})
          </span>
        </div>
        <div className="flex gap-1">
          {paths.length > 1 && (
            <>
              <Button variant="outline" size="sm" onClick={handlePrev} className="rounded-none size-8 p-0">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext} className="rounded-none size-8 p-0">
                <ChevronRight className="size-4" />
              </Button>
            </>
          )}
          {currentUrl && (
            <>
              <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="xs" className="cursor-pointer">
                    <Maximize2 className="size-4 mr-2" />
                    Ampliar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] flex flex-col p-0 overflow-hidden rounded-none border-border">
                  <DialogTitle className="sr-only">Ampliación de {currentPath.split('/').pop()}</DialogTitle>
                  <div className="flex-1 bg-black/5 flex items-center justify-center p-4 relative overflow-hidden">
                    {isImage ? (
                      <ZoomableImage src={currentUrl} alt="Archivo adjunto ampliado" />
                    ) : isPdf ? (
                      <object
                        data={currentUrl}
                        type="application/pdf"
                        className="w-full h-full"
                      >
                        <iframe src={currentUrl} className="w-full h-full border-0" title="PDF viewer">
                          Este navegador no soporta PDFs embebidos.
                        </iframe>
                      </object>
                    ) : (
                      <div className="flex flex-col items-center gap-4 p-8">
                        <FileText className="size-12 text-muted-foreground" />
                        <span className="text-sm">Vista previa no disponible para este tipo de archivo.</span>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="default" size="xs" asChild >
                <a href={currentUrl} target="_blank" rel="noopener noreferrer" download>
                  <Download className="size-4" />

                </a>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="relative w-full border border-border bg-black/5 flex items-center justify-center min-h-[300px] overflow-hidden rounded-none">
        {!currentUrl ? (
          <div className="text-sm text-muted-foreground">Error al cargar este archivo.</div>
        ) : isImage ? (
          <>
            {mediaLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <Spinner className="size-8 text-primary" />
              </div>
            )}
            <img
              src={currentUrl}
              alt="Archivo adjunto"
              className={`max-w-full max-h-[600px] object-contain cursor-zoom-in hover:opacity-90 transition-opacity duration-300 ${mediaLoading ? 'opacity-0' : 'opacity-100'}`}
              onClick={() => setIsExpanded(true)}
              onLoad={() => setMediaLoading(false)}
            />
          </>
        ) : isPdf ? (
          <>
            {mediaLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <Spinner className="size-8 text-primary" />
              </div>
            )}
            <object
              data={currentUrl}
              type="application/pdf"
              className={`w-full h-[600px] transition-opacity duration-300 ${mediaLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setMediaLoading(false)}
            >
              <iframe 
                src={currentUrl} 
                className="w-full h-[600px] border-0" 
                title="PDF viewer"
                onLoad={() => setMediaLoading(false)}
              >
                Este navegador no soporta PDFs embebidos.
              </iframe>
            </object>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 p-8">
            <FileText className="size-12 text-muted-foreground" />
            <span className="text-sm">Vista previa no disponible para este tipo de archivo.</span>
            <Button variant="outline" size="sm" asChild className="rounded-none">
              <a href={currentUrl} target="_blank" rel="noopener noreferrer">
                Abrir en nueva pestaña
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
