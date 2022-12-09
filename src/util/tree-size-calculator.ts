export function calculateTreeSize(size: number): number {
  let newSize = size - 9;
  if (newSize < 0) newSize = 0;
  return newSize;
}
