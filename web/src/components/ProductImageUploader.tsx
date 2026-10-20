import { ProgressiveImage } from '@/components/ProgressiveImage'
import { useEffect, useId, useRef, useState } from 'react'
import { ImageOff, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { uploadImages } from '@/api/product'
import { imageSelectionError, sellerErrorMessage } from '@/lib/productForm'
import { Button } from '@/components/ui/button'

interface Props {
  value: string[]
  onChange: (images: string[]) => void
  onUploadingChange: (uploading: boolean) => void
  disabled?: boolean
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

function Preview({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  return failed ? <div className="flex size-full items-center justify-center bg-muted text-muted-foreground"><ImageOff className="size-6" aria-label="图片暂不可用" /></div> : <ProgressiveImage src={src} alt={alt} className="size-full object-cover" onError={() => setFailed(true)} />
}

export function ProductImageUploader({ value, onChange, onUploadingChange, disabled, id, ...aria }: Props) {
  const fallbackId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const controller = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const previews = useRef(new Set<string>())
  const [pending, setPending] = useState<{ url: string; name: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | undefined>(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    mounted.current = true
    const urls = previews.current
    return () => {
      mounted.current = false
      controller.current?.abort()
      urls.forEach((url) => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  async function selectFiles(files: File[]) {
    if (!files.length || controller.current || disabled) return
    const validation = imageSelectionError(files, value.length)
    if (validation) { setError(validation); toast.error(validation); return }
    const abort = new AbortController()
    controller.current = abort
    const local = files.map((file) => ({ url: URL.createObjectURL(file), name: file.name }))
    local.forEach(({ url }) => previews.current.add(url))
    setPending(local)
    setProgress(0)
    setError(null)
    setBusy(true)
    onUploadingChange(true)
    try {
      const urls = await uploadImages(files, { signal: abort.signal, onProgress: (percent) => { if (mounted.current) setProgress(percent) } })
      if (abort.signal.aborted || !mounted.current) return
      if (urls.length !== files.length || urls.some((url) => !url)) throw new Error('incomplete upload')
      onChange([...value, ...urls])
      toast.success(`已上传 ${urls.length} 张图片`)
    } catch (cause) {
      if (mounted.current && !abort.signal.aborted) {
        const message = sellerErrorMessage(cause)
        setError(message)
        toast.error(message)
      }
    } finally {
      local.forEach(({ url }) => { URL.revokeObjectURL(url); previews.current.delete(url) })
      controller.current = null
      if (mounted.current) { setPending([]); setBusy(false); onUploadingChange(false) }
    }
  }

  return <div className="space-y-4">
    <input {...aria} ref={inputRef} id={id || fallbackId} type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp" className="sr-only" disabled={disabled || busy || value.length >= 9} onChange={(event) => {
      const files = Array.from(event.target.files || [])
      event.target.value = ''
      void selectFiles(files)
    }} />
    <p className="text-xs leading-6 text-muted-foreground">最多 9 张，每张不超过 2MB，支持 JPG / PNG / GIF / WebP。第一张为商品主图。</p>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {value.map((url, index) => <div key={`${url}-${index}`} className="space-y-2"><div className="relative aspect-square overflow-hidden rounded-lg border bg-muted/40"><Preview key={url} src={url} alt={`商品图片 ${index + 1}`} /><button type="button" className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-bl-lg bg-background/95" aria-label={`移除第 ${index + 1} 张图片`} disabled={disabled || busy} onClick={() => onChange(value.filter((_, position) => position !== index))}><X className="size-4" /></button></div>{index === 0 ? <p className="flex min-h-11 items-center text-xs font-medium">主图</p> : <button type="button" className="min-h-11 text-xs text-muted-foreground underline-offset-4 hover:underline" disabled={disabled || busy} onClick={() => onChange([url, ...value.filter((_, position) => position !== index)])}>设为主图</button>}</div>)}
      {pending.map(({ url, name }) => <div key={url} className="space-y-2"><div className="aspect-square overflow-hidden rounded-lg border bg-muted/40 opacity-65"><Preview src={url} alt={name} /></div><p className="truncate text-xs text-muted-foreground">{name} · 上传中</p></div>)}
      {value.length + pending.length < 9 && <Button type="button" variant="outline" className="aspect-square h-auto flex-col gap-3 rounded-lg border-dashed" disabled={disabled || busy} onClick={() => inputRef.current?.click()}><Plus className="size-6" />选择图片</Button>}
    </div>
    {busy && <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm" role="status">{progress === undefined ? '正在上传…' : progress >= 99 ? '图片已发送，正在确认…' : `上传中 ${progress}%`}</p><Button type="button" variant="ghost" className="h-11" onClick={() => controller.current?.abort()}>取消上传</Button></div><div role="progressbar" aria-label="图片上传进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: progress === undefined ? '33%' : `${progress}%` }} /></div></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <p className="text-xs text-muted-foreground">已选择 {value.length + pending.length} / 9 张</p>
  </div>
}
