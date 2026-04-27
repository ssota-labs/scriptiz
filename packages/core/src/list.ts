import type { UserList, UserListItem } from "@scriptiz/schemas";

export function createUserList(input: {
  id: string;
  name: string;
  description?: string;
  now: string;
}): UserList {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    items: [],
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function addResourceToList(
  list: UserList,
  input: { resourceId: string; itemId: string; note?: string; now: string },
): UserList {
  const item: UserListItem = {
    id: input.itemId,
    resourceId: input.resourceId,
    note: input.note,
    addedAt: input.now,
  };
  return {
    ...list,
    items: [...list.items, item],
    updatedAt: input.now,
  };
}

export function removeListItem(
  list: UserList,
  itemId: string,
  now: string,
): UserList {
  return {
    ...list,
    items: list.items.filter((i) => i.id !== itemId),
    updatedAt: now,
  };
}

export function updateListMetadata(
  list: UserList,
  patch: { name?: string; description?: string | undefined },
  now: string,
): UserList {
  return {
    ...list,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined
      ? { description: patch.description }
      : {}),
    updatedAt: now,
  };
}
