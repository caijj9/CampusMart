import { useState } from 'react'
import type { ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function PasswordInput(props: ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false)
  return <div className="relative">
    <Input {...props} type={visible ? 'text' : 'password'} className="h-11 pr-12" />
    <button type="button" className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-lg text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring" onClick={() => setVisible(!visible)} aria-label={visible ? '隐藏密码' : '显示密码'} aria-pressed={visible}>
      {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  </div>
}
