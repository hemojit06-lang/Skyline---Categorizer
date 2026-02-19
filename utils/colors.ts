
const NEON_PALETTE = [
  '#00f2ff', // Neon Cyan
  '#7000ff', // Neon Purple
  '#ff00f2', // Neon Magenta
  '#00ff2f', // Neon Green
  '#f2ff00', // Neon Yellow
  '#ff4d00', // Neon Orange
  '#ff003c', // Neon Red
  '#007bff', // Electric Blue
  '#39ff14', // Alien Green
  '#bc13fe', // Ultraviolet
];

export const getNeonColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % NEON_PALETTE.length;
  return NEON_PALETTE[index];
};

export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
