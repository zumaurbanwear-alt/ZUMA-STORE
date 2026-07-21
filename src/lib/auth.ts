export type AdminRoleRecord = {
  role?: string | null;
} | null | undefined;

export const isAdminRoleRecord = (row: AdminRoleRecord) => row?.role === "admin";
