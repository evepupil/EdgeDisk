import { describe, expect, it } from 'vitest'
import { HttpError } from './errors.ts'
import {
  DEFAULT_SEARCH_LIMIT,
  MAX_QUERY_LENGTH,
  MAX_SEARCH_LIMIT,
  buildSearchPattern,
  escapeLikePattern,
  normalizeSearchQuery,
  resolveSearchLimit,
  resolveSearchOffset
} from './search-query.ts'

describe('escapeLikePattern', () => {
  it('普通文本原样保留', () => {
    expect(escapeLikePattern('report')).toBe('report')
  })

  it('转义百分号，否则搜「100%」会退化成前缀匹配', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%')
  })

  it('转义下划线，否则它会匹配任意单字符', () => {
    expect(escapeLikePattern('a_b')).toBe('a\\_b')
  })

  it('先转义反斜杠本身，避免把后面的转义拆错', () => {
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b')
    expect(escapeLikePattern('a\\%b')).toBe('a\\\\\\%b')
  })

  it('中文和空格不受影响', () => {
    expect(escapeLikePattern('年度 报告')).toBe('年度 报告')
  })
})

describe('normalizeSearchQuery', () => {
  it('去掉首尾空白', () => {
    expect(normalizeSearchQuery('  report  ')).toBe('report')
  })

  it('空关键词报错', () => {
    expect(() => normalizeSearchQuery('')).toThrow(HttpError)
    expect(() => normalizeSearchQuery('   ')).toThrow(HttpError)
    expect(() => normalizeSearchQuery(null)).toThrow(HttpError)
    expect(() => normalizeSearchQuery(undefined)).toThrow(HttpError)
  })

  it('超长关键词报错', () => {
    expect(() => normalizeSearchQuery('x'.repeat(MAX_QUERY_LENGTH + 1))).toThrow(HttpError)
    expect(normalizeSearchQuery('x'.repeat(MAX_QUERY_LENGTH))).toHaveLength(MAX_QUERY_LENGTH)
  })
})

describe('buildSearchPattern', () => {
  it('包裹成子串匹配并转小写', () => {
    expect(buildSearchPattern('Report')).toBe('%report%')
  })

  it('关键词里的通配符仍然被转义', () => {
    expect(buildSearchPattern('50%_off')).toBe('%50\\%\\_off%')
  })
})

describe('resolveSearchLimit', () => {
  it('缺省或非法值用默认页大小', () => {
    expect(resolveSearchLimit(null)).toBe(DEFAULT_SEARCH_LIMIT)
    expect(resolveSearchLimit('')).toBe(DEFAULT_SEARCH_LIMIT)
    expect(resolveSearchLimit('abc')).toBe(DEFAULT_SEARCH_LIMIT)
    expect(resolveSearchLimit(0)).toBe(DEFAULT_SEARCH_LIMIT)
    expect(resolveSearchLimit(-5)).toBe(DEFAULT_SEARCH_LIMIT)
  })

  it('采用合法值，并压到上限', () => {
    expect(resolveSearchLimit('20')).toBe(20)
    expect(resolveSearchLimit(99999)).toBe(MAX_SEARCH_LIMIT)
  })
})

describe('resolveSearchOffset', () => {
  it('缺省或非法值从头开始', () => {
    expect(resolveSearchOffset(null)).toBe(0)
    expect(resolveSearchOffset('abc')).toBe(0)
    expect(resolveSearchOffset(-1)).toBe(0)
  })

  it('采用合法偏移', () => {
    expect(resolveSearchOffset('50')).toBe(50)
  })
})
