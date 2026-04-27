import type { UserList } from "@scriptiz/schemas";

export interface ListStorePort {
  getListById(id: string): Promise<UserList | null>;
  putList(userList: UserList): Promise<void>;
  listIds(): Promise<string[]>;
}
