import { ImageResponse } from 'next/og';
export const alt = 'YQG Events — A little more local. A lot to look forward to.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: '#f4f3eb',
        color: '#234d3b',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
      }}
    >
      <div style={{ fontSize: 30, marginBottom: 45 }}>✳ yqg events / WINDSOR–ESSEX</div>
      <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -4 }}>A little more local.</div>
      <div style={{ fontSize: 62, color: '#6b805f' }}>A lot to look forward to.</div>
      <div style={{ fontSize: 25, marginTop: 50 }}>
        Music. Markets. Festivals. Your next good plan.
      </div>
    </div>,
    size,
  );
}
