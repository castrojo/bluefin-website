import { describe, expect, it } from 'vitest'
import { assertSafeSvg, recolor } from '../update-growth-chart.js'

describe('update-growth-chart helpers', () => {
  it('recolors the upstream palette to the site theme', () => {
    const out = recolor('<svg><rect fill="#ffffff"/><text id="text_16">x</text></svg>')
    expect(out).toContain('#0c1016')
    expect(out).toContain('id="text_16" style="fill: #bdbdbd">')
    expect(out).not.toContain('#ffffff')
  })

  it('accepts a plain SVG document', () => {
    expect(() => assertSafeSvg('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>')).not.toThrow()
  })

  it('rejects non-SVG content', () => {
    expect(() => assertSafeSvg('<html><body>nope</body></html>')).toThrow(/not an SVG/)
  })

  it('rejects SVGs with script elements', () => {
    expect(() => assertSafeSvg('<svg><script>alert(1)</script></svg>')).toThrow(/scriptable/)
  })

  it('rejects SVGs with event-handler attributes', () => {
    expect(() => assertSafeSvg('<svg onload="alert(1)"><rect/></svg>')).toThrow(/scriptable/)
    expect(() => assertSafeSvg('<svg><rect onerror="alert(1)"/></svg>')).toThrow(/scriptable/)
  })
})
