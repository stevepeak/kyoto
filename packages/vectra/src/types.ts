import type { MetadataFilter } from 'vectra';

export interface VectraItem {
  vector: number[];
  metadata: Record<string, unknown>;
  id?: string;
}

export interface VectraQueryOptions {
  topK?: number;
  filter?: MetadataFilter;
  threshold?: number;
}

