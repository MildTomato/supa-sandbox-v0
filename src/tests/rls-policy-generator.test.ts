import {
  generateRLSPolicy,
  Group,
  Condition,
  Table,
} from "../rls-policy-generator";

// Update the PolicyInput type to include tables
type PolicyInput = {
  policyName: string;
  tableName: string;
  policyType: "permissive" | "restrictive";
  operations: Record<string, boolean>;
  rootGroup: Group;
  tables: Table[];
  finalCondition?: Condition;
};

// Define mock tables to use in tests
// Define mock tables to use in tests
const mockTables: Table[] = [
  {
    id: "1",
    name: "projects",
    schema: "public",
    columns: [
      {
        id: "1",
        table_id: "1",
        name: "id",
        position: 1,
        default_value: null,
        is_nullable: false,
        is_unique: true,
        is_primary_key: true,
        is_foreign_key: false,
        type: "uuid",
        enums: [],
        comment: null,
      },
      {
        id: "2",
        table_id: "1",
        name: "organization_id",
        position: 2,
        default_value: null,
        is_nullable: true,
        is_unique: false,
        is_primary_key: false,
        is_foreign_key: true,
        type: "uuid",
        enums: [],
        comment: null,
      },
    ],
    relationships: [
      {
        id: "1",
        source_schema: "public",
        source_table_name: "projects",
        source_column_name: "organization_id",
        target_table_name: "organizations",
        target_column_name: "id",
      },
    ],
  },
  {
    id: "2",
    name: "members",
    schema: "public",
    columns: [
      {
        id: "3",
        table_id: "2",
        name: "id",
        position: 1,
        default_value: null,
        is_nullable: false,
        is_unique: true,
        is_primary_key: true,
        is_foreign_key: false,
        type: "uuid",
        enums: [],
        comment: null,
      },
      {
        id: "4",
        table_id: "2",
        name: "user_id",
        position: 2,
        default_value: null,
        is_nullable: true,
        is_unique: false,
        is_primary_key: false,
        is_foreign_key: false,
        type: "uuid",
        enums: [],
        comment: null,
      },
      {
        id: "5",
        table_id: "2",
        name: "organization_id",
        position: 3,
        default_value: null,
        is_nullable: true,
        is_unique: false,
        is_primary_key: false,
        is_foreign_key: true,
        type: "uuid",
        enums: [],
        comment: null,
      },
      {
        id: "6",
        table_id: "2",
        name: "role",
        position: 4,
        default_value: null,
        is_nullable: true,
        is_unique: false,
        is_primary_key: false,
        is_foreign_key: false,
        type: "text",
        enums: [],
        comment: null,
      },
    ],
    relationships: [
      {
        id: "2",
        source_schema: "public",
        source_table_name: "members",
        source_column_name: "organization_id",
        target_table_name: "organizations",
        target_column_name: "id",
      },
    ],
  },
  {
    id: "3",
    name: "teams",
    schema: "public",
    columns: [
      {
        id: "7",
        table_id: "3",
        name: "id",
        position: 1,
        default_value: null,
        is_nullable: false,
        is_unique: true,
        is_primary_key: true,
        is_foreign_key: false,
        type: "uuid",
        enums: [],
        comment: null,
      },
      {
        id: "8",
        table_id: "3",
        name: "organization_id",
        position: 2,
        default_value: null,
        is_nullable: true,
        is_unique: false,
        is_primary_key: false,
        is_foreign_key: true,
        type: "uuid",
        enums: [],
        comment: null,
      },
    ],
    relationships: [
      {
        id: "3",
        source_schema: "public",
        source_table_name: "teams",
        source_column_name: "organization_id",
        target_table_name: "organizations",
        target_column_name: "id",
      },
    ],
  },
  {
    id: "4",
    name: "organizations",
    schema: "public",
    columns: [
      {
        id: "9",
        table_id: "4",
        name: "id",
        position: 1,
        default_value: null,
        is_nullable: false,
        is_unique: true,
        is_primary_key: true,
        is_foreign_key: false,
        type: "uuid",
        enums: [],
        comment: null,
      },
      {
        id: "10",
        table_id: "4",
        name: "name",
        position: 2,
        default_value: null,
        is_nullable: false,
        is_unique: false,
        is_primary_key: false,
        is_foreign_key: false,
        type: "text",
        enums: [],
        comment: null,
      },
    ],
    relationships: [],
  },
];

describe("RLS Policy Generator", () => {
  // Corrected test for simple condition that respects relationships
  it("generates correct SQL for simple condition", () => {
    const input: PolicyInput = {
      policyName: "projects_access_policy",
      tableName: "projects",
      policyType: "permissive",
      operations: { select: true, insert: false, update: false, delete: false },
      rootGroup: {
        id: "root",
        type: "AND",
        items: [
          {
            id: "1",
            leftTable: "members",
            leftColumn: "user_id",
            operator: "=",
            rightType: "function",
            rightFunction: "auth.uid()",
          },
        ],
      },
      tables: mockTables,
      finalCondition: {
        id: "final",
        leftTable: "organizations",
        leftColumn: "id",
        operator: "=",
        rightType: "column",
        rightTable: "projects",
        rightColumn: "organization_id",
      },
    };

    const expectedSQL = `CREATE POLICY "projects_access_policy" ON projects AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM members JOIN organizations ON organizations.id = members.organization_id WHERE members.user_id = auth.uid() AND organizations.id = projects.organization_id));`;

    expect(generateRLSPolicy(input)).toBe(expectedSQL);
  });

  // Corrected test for nested conditions with OR
  it("generates correct SQL for nested conditions with OR", () => {
    const input: PolicyInput = {
      policyName: "nested_conditions_policy",
      tableName: "projects",
      policyType: "permissive",
      operations: { SELECT: true },
      rootGroup: {
        id: "root",
        type: "AND",
        items: [
          {
            id: "1",
            leftTable: "members",
            leftColumn: "user_id",
            operator: "=",
            rightType: "function",
            rightFunction: "auth.uid()",
          } as Condition,
          {
            id: "2",
            type: "OR",
            items: [
              {
                id: "3",
                leftTable: "members",
                leftColumn: "role",
                operator: "=",
                rightType: "value",
                rightValue: "admin",
              } as Condition,
              {
                id: "4",
                leftTable: "members",
                leftColumn: "role",
                operator: "=",
                rightType: "value",
                rightValue: "manager",
              } as Condition,
            ],
          } as Group,
        ],
      },
      tables: mockTables,
      finalCondition: {
        id: "final",
        leftTable: "organizations",
        leftColumn: "id",
        operator: "=",
        rightType: "column",
        rightTable: "projects",
        rightColumn: "organization_id",
      },
    };

    const expectedSQL = `CREATE POLICY "nested_conditions_policy" ON projects AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM members JOIN organizations ON organizations.id = members.organization_id WHERE members.user_id = auth.uid() AND (members.role = 'admin' OR members.role = 'manager') AND organizations.id = projects.organization_id));`;

    expect(generateRLSPolicy(input)).toBe(expectedSQL);
  });

  it("generates correct SQL with multiple conditions across three tables", () => {
    const input: PolicyInput = {
      policyName: "adds",
      tableName: "projects",
      policyType: "permissive",
      operations: { SELECT: true },
      rootGroup: {
        id: "root",
        type: "AND",
        items: [
          {
            id: "1",
            leftTable: "members",
            leftColumn: "user_id",
            operator: "=",
            rightType: "function",
            rightFunction: "auth.uid()",
          } as Condition,
          {
            id: "2",
            leftTable: "members",
            leftColumn: "organization_id",
            operator: "=",
            rightType: "column",
            rightTable: "projects",
            rightColumn: "organization_id",
          } as Condition,
          {
            id: "3",
            leftTable: "organizations",
            leftColumn: "id",
            operator: "=",
            rightType: "column",
            rightTable: "projects",
            rightColumn: "organization_id",
          } as Condition,
        ],
      },
      tables: mockTables,
    };

    const expectedSQL = `CREATE POLICY "adds" ON projects AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM members JOIN organizations ON organizations.id = members.organization_id WHERE members.user_id = auth.uid() AND members.organization_id = projects.organization_id AND organizations.id = projects.organization_id));`;

    expect(generateRLSPolicy(input)).toBe(expectedSQL);
  });

  it("generates correct SQL with conditions on different tables", () => {
    const input: PolicyInput = {
      policyName: "dasdsds",
      tableName: "projects",
      policyType: "permissive",
      operations: { SELECT: true },
      rootGroup: {
        id: "root",
        type: "AND",
        items: [
          {
            id: "1",
            leftTable: "teams",
            leftColumn: "organization_id",
            operator: "=",
            rightType: "column",
            rightTable: "projects",
            rightColumn: "organization_id",
          } as Condition,
          {
            id: "2",
            leftTable: "members",
            leftColumn: "user_id",
            operator: "=",
            rightType: "function",
            rightFunction: "auth.uid()",
          } as Condition,
        ],
      },
      tables: mockTables,
    };

    const expectedSQL = `CREATE POLICY "dasdsds" ON projects AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM teams WHERE teams.organization_id = projects.organization_id AND members.user_id = auth.uid()));`;

    expect(generateRLSPolicy(input)).toBe(expectedSQL);
  });
  // Additional tests...
});
