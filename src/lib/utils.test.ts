import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('合并多个类名', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
  })

  it('忽略 falsy 值', () => {
    const hidden = false
    expect(cn('px-2', hidden && 'hidden', undefined, null)).toBe('px-2')
  })

  it('冲突的 tailwind 类后者覆盖前者', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })
})
