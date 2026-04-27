import type { Resource } from "@scriptiz/schemas";

export interface ResourceStorePort {
  getResourceById(id: string): Promise<Resource | null>;
  putResource(resource: Resource): Promise<void>;
}
