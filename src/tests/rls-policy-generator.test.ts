import { generateRLSPolicy } from "../rls-policy-generator";
import { mockTables } from "../mocks/mockTables";
import { Group, Condition, Table } from "../types/types";

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

// The mockTables constant has been removed from here

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

  it("generates correct SQL for policy with user membership and organization check", () => {
    const input: PolicyInput = {
      policyName: "user_membership_org_check",
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
            leftTable: "teams",
            leftColumn: "organization_id",
            operator: "=",
            rightType: "column",
            rightTable: "projects",
            rightColumn: "organization_id",
          } as Condition,
        ],
      },
      tables: mockTables,
    };

    const expectedSQL = `CREATE POLICY "user_membership_org_check" ON projects AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM members JOIN teams ON teams.organization_id = projects.organization_id WHERE members.user_id = auth.uid() AND teams.organization_id = projects.organization_id));`;

    expect(generatePolicy(input)).toBe(expectedSQL);
  });
  // Additional tests...
});
