import { Table } from "../types/types";

export const mockTables: Table[] = [
  {
    id: "1",
    name: "projects",
    schema: "public",
    columns: [
      { name: "id", type: "uuid", is_primary_key: true },
      { name: "name", type: "text" },
      {
        name: "organization_id",
        type: "uuid",
        is_foreign_key: true,
        foreign_key_table: "organizations",
        foreign_key_column: "id",
      },
      { name: "created_at", type: "timestamp" },
      { name: "user_id", type: "uuid" },
    ],
    relationships: [
      {
        type: "foreign_key",
        foreign_key_table: "organizations",
        foreign_key_column: "id",
        column: "organization_id",
      },
    ],
  },
  {
    id: "2",
    name: "members",
    schema: "public",
    columns: [
      { name: "id", type: "uuid", is_primary_key: true },
      { name: "user_id", type: "uuid" },
      {
        name: "organization_id",
        type: "uuid",
        is_foreign_key: true,
        foreign_key_table: "organizations",
        foreign_key_column: "id",
      },
      { name: "role", type: "text" },
      {
        name: "team_id",
        type: "uuid",
        is_foreign_key: true,
        foreign_key_table: "teams",
        foreign_key_column: "id",
      },
    ],
    relationships: [
      {
        type: "foreign_key",
        foreign_key_table: "organizations",
        foreign_key_column: "id",
        column: "organization_id",
      },
      {
        type: "foreign_key",
        foreign_key_table: "teams",
        foreign_key_column: "id",
        column: "team_id",
      },
    ],
  },
  {
    id: "3",
    name: "organizations",
    schema: "public",
    columns: [
      { name: "id", type: "uuid", is_primary_key: true },
      { name: "name", type: "text" },
    ],
    relationships: [],
  },
  {
    id: "4",
    name: "teams",
    schema: "public",
    columns: [
      { name: "id", type: "uuid", is_primary_key: true },
      { name: "name", type: "text" },
      {
        name: "organization_id",
        type: "uuid",
        is_foreign_key: true,
        foreign_key_table: "organizations",
        foreign_key_column: "id",
      },
    ],
    relationships: [
      {
        type: "foreign_key",
        foreign_key_table: "organizations",
        foreign_key_column: "id",
        column: "organization_id",
      },
    ],
  },
];
