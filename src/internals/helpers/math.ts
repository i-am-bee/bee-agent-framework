import { FrameworkError } from "@/errors.js";

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new FrameworkError("Vectors must have equal length");
  }
  // (cos θ) = (A · B) / (|A| * |B|)
  const dot = vecA.reduce((sum, value, index) => sum + value * vecB[index], 0);
  const magA = Math.sqrt(vecA.reduce((sum, value) => sum + value ** 2, 0));
  const magB = Math.sqrt(vecB.reduce((sum, value) => sum + value ** 2, 0));

  if (magA === 0 || magB === 0) {
    throw new FrameworkError("Vectors cannot not have zero magnitude");
  }
  return dot / (magA * magB);
}

export function cosineSimilarityWithMatrix(vector: number[], matrix: number[][]): number[] {
  return matrix.map((row) => cosineSimilarity(vector, row));
}
