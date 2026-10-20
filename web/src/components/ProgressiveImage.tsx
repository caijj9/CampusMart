import { useState } from 'react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

type Props = Omit<ComponentProps<'img'>, 'alt' | 'src'> & { alt: string; src: string }

export function ProgressiveImage({ src, alt, className, onLoad, ...props }: Props) {
  const [loadedSource, setLoadedSource] = useState<string>()
  return <img {...props} src={src} alt={alt} className={cn('bg-muted transition-[opacity,filter] duration-200 motion-reduce:transition-none', loadedSource === src ? 'opacity-100 blur-none' : 'opacity-0 blur-sm', className)} onLoad={(event) => { setLoadedSource(src); onLoad?.(event) }} />
}
