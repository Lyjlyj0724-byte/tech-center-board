import { describe, expect, it } from 'vitest'
import { destCountry, destFactory, deviceGroup, fmtPct, lineGroup } from './index'

describe('deviceGroup 设备三分组', () => {
  it('类别为设备的归入设备组', () => {
    expect(deviceGroup({ category: '设备', type: '检测仪' })).toBe('设备')
  })

  it('龙头/压脚/托板归入零部件组', () => {
    expect(deviceGroup({ category: '辅助工具', type: '龙头' })).toBe('零部件')
    expect(deviceGroup({ category: '辅助工具', type: '压脚' })).toBe('零部件')
    expect(deviceGroup({ category: '辅助工具', type: '托板' })).toBe('零部件')
  })

  it('其余归入辅助工具组', () => {
    expect(deviceGroup({ category: '辅助工具', type: '装置' })).toBe('辅助工具')
  })
})

describe('lineGroup 出货产品线分组', () => {
  it('设备产品线归入设备组', () => {
    expect(lineGroup('设备')).toBe('设备')
  })

  it('龙头与零部件归入零部件组', () => {
    expect(lineGroup('龙头')).toBe('零部件')
    expect(lineGroup('零部件')).toBe('零部件')
  })

  it('辅具等归入辅助工具组', () => {
    expect(lineGroup('辅具')).toBe('辅助工具')
  })
})

describe('destFactory / destCountry 出货目的地解析', () => {
  it('去掉国家前缀得到工厂名', () => {
    expect(destFactory('越南德利')).toBe('德利')
    expect(destFactory('柬埔寨宏泰')).toBe('宏泰')
  })

  it('无前缀时原样返回', () => {
    expect(destFactory('上海工厂')).toBe('上海工厂')
  })

  it('按目的地识别国家', () => {
    expect(destCountry('越南德利')).toBe('越南')
    expect(destCountry('柬埔寨宏泰')).toBe('柬埔寨')
    expect(destCountry('上海工厂')).toBe('中国')
  })
})

describe('fmtPct 百分比格式化', () => {
  it('null 显示为 —', () => {
    expect(fmtPct(null)).toBe('—')
  })

  it('比率格式化为一位小数百分比', () => {
    expect(fmtPct(0.975)).toBe('97.5%')
  })
})
