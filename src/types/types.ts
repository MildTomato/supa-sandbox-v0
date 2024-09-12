export type Column = {
  id: string;
  table_id: string;
  name: string;
  position: number;
  default_value: string | null;
  is_nullable: boolean;
  is_unique: boolean;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  type: string;
  enums: string[];
  comment: string | null;
};

export interface Relationship {
  id: string;
  source_schema: string;
  source_table_name: string;
  source_column_name: string;
  target_table_name: string;
  target_column_name: string;
}

export interface Table {
  id: string;
  name: string;
  schema: string;
  columns: Column[];
  relationships: Relationship[];
}

export interface Condition {
  id: string;
  leftTable: string;
  leftColumn: string;
  operator: string;
  rightType: "column" | "value" | "function";
  rightTable?: string;
  rightColumn?: string;
  rightValue?: string;
  rightFunction?: string;
}

export interface Group {
  id: string;
  type: "AND" | "OR";
  items: (Condition | Group)[];
}

export interface PolicyInput {
  policyName: string;
  tableName: string;
  policyType: "permissive" | "restrictive";
  operations: Record<string, boolean>;
  rootGroup: Group;
  tables: Table[];
}
