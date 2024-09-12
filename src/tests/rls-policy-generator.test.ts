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
};

describe("RLS Policy Generator", () => {
  // Test for generating SQL for a simple condition without unnecessary JOINs
  it("generates SQL for simple user access policy with necessary conditions only", () => {
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
          {
            id: "2",
            leftTable: "members",
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

    const expectedSQL = `CREATE POLICY "projects_access_policy" ON projects AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM members WHERE members.user_id = auth.uid() AND members.organization_id = projects.organization_id));`;

    expect(generateRLSPolicy(input)).toBe(expectedSQL);
  });

  // Additional tests could be added similarly, making sure to include JOINs only when they are required by the conditions.
  it("generates SQL with JOIN to organizations table", () => {
    const input: PolicyInput = {
      policyName: "projects_org_access_policy",
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
          {
            id: "2",
            leftTable: "organizations",
            leftColumn: "id",
            operator: "=",
            rightType: "column",
            rightTable: "projects",
            rightColumn: "organization_id",
          },
          {
            id: "3",
            leftTable: "organizations",
            leftColumn: "is_active",
            operator: "=",
            rightType: "value",
            rightValue: "true",
          },
        ],
      },
      tables: mockTables,
    };

    const expectedSQL = `CREATE POLICY "projects_org_access_policy" ON projects AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM members JOIN organizations ON organizations.id = projects.organization_id WHERE members.user_id = auth.uid() AND organizations.id = projects.organization_id AND organizations.is_active = 'true'));`;

    expect(generateRLSPolicy(input)).toBe(expectedSQL);
  });
});
