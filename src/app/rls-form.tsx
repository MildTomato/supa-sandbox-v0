"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PlusCircle, X } from "lucide-react";
import { format } from "sql-formatter";

type Operation = "SELECT" | "INSERT" | "UPDATE" | "DELETE";

interface Column {
  name: string;
  type: string;
  is_primary_key?: boolean;
  is_foreign_key?: boolean;
  foreign_key_table?: string;
  foreign_key_column?: string;
}

interface Relationship {
  type: string;
  foreign_key_table: string;
  foreign_key_column: string;
  column: string;
}

interface Table {
  name: string;
  schema: string;
  columns: Column[];
  relationships: Relationship[];
}

const mockTables: Table[] = [
  {
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
    name: "organizations",
    schema: "public",
    columns: [
      { name: "id", type: "uuid", is_primary_key: true },
      { name: "name", type: "text" },
      { name: "created_at", type: "timestamp" },
    ],
    relationships: [],
  },
  {
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
      { name: "status", type: "text" },
      { name: "created_at", type: "timestamp" },
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

type Condition = {
  id: string;
  leftTable: string;
  leftColumn: string;
  operator: string;
  rightType: "column" | "value" | "function";
  rightTable?: string;
  rightColumn?: string;
  rightValue?: string;
  rightFunction?: string;
};

type Group = {
  id: string;
  type: "AND" | "OR";
  items: (Condition | Group)[];
};

export default function RLSPolicyCreator() {
  const [policyName, setPolicyName] = useState("");
  const [tableName, setTableName] = useState("");
  const [policyType, setPolicyType] = useState<"permissive" | "restrictive">(
    "permissive"
  );
  const [operations, setOperations] = useState<Record<Operation, boolean>>({
    SELECT: false,
    INSERT: false,
    UPDATE: false,
    DELETE: false,
  });
  const [rootGroup, setRootGroup] = useState<Group>({
    id: "root",
    type: "AND",
    items: [],
  });
  const [formattedPolicy, setFormattedPolicy] = useState("");

  const handleOperationChange = (operation: Operation) => {
    setOperations((prev) => ({ ...prev, [operation]: !prev[operation] }));
  };

  const addCondition = (group: Group) => {
    const newCondition: Condition = {
      id: Math.random().toString(36).substr(2, 9),
      leftTable: tableName,
      leftColumn: "",
      operator: "=",
      rightType: "column",
      rightTable: tableName,
      rightColumn: "",
    };
    setRootGroup((prevRoot) => ({
      ...prevRoot,
      items:
        prevRoot.id === group.id
          ? [...prevRoot.items, newCondition]
          : prevRoot.items.map((item) =>
              "items" in item
                ? { ...item, items: [...item.items, newCondition] }
                : item
            ),
    }));
  };

  const addGroup = () => {
    const newGroup: Group = {
      id: Math.random().toString(36).substr(2, 9),
      type: "AND",
      items: [],
    };
    setRootGroup((prevRoot) => ({
      ...prevRoot,
      items: [...prevRoot.items, newGroup],
    }));
  };

  const updateItem = (
    item: Condition | Group,
    field: string,
    value: string
  ) => {
    const updateNestedGroup = (group: Group): Group => {
      return {
        ...group,
        items: group.items.map((i) =>
          i.id === item.id
            ? "items" in i
              ? { ...i, type: value as "AND" | "OR" }
              : { ...i, [field]: value }
            : "items" in i
            ? updateNestedGroup(i)
            : i
        ),
      };
    };

    setRootGroup((prevRoot) => updateNestedGroup(prevRoot));
  };

  const removeItem = (itemToRemove: Condition | Group) => {
    const removeItemFromGroup = (group: Group): Group => {
      return {
        ...group,
        items: group.items
          .filter((item) => item.id !== itemToRemove.id)
          .map((item) => ("items" in item ? removeItemFromGroup(item) : item)),
      };
    };

    setRootGroup((prevRoot) => removeItemFromGroup(prevRoot));
  };

  const generatePolicy = () => {
    const operationsString = Object.entries(operations)
      .filter(([, value]) => value)
      .map(([key]) => key)
      .join(", ");

    if (!policyName || !tableName || !operationsString) {
      return "Please fill in all required fields to generate the policy.";
    }

    const generatePolicyExpression = (group: Group): string => {
      const conditions = group.items.map((item) => {
        if ("items" in item) {
          return `(${generatePolicyExpression(item)})`;
        } else {
          return `${item.leftTable}.${item.leftColumn} ${item.operator} ${
            item.rightFunction ||
            item.rightValue ||
            `${item.rightTable}.${item.rightColumn}`
          }`;
        }
      });

      return conditions.join(` ${group.type || "AND"} `);
    };

    const policyExpression = generatePolicyExpression(rootGroup);

    const tablesUsed = new Set(
      rootGroup.items
        .filter((item) => !("items" in item))
        .flatMap((item) => [item.leftTable, item.rightTable])
        .filter((table) => table && table !== tableName)
    );

    const mainTable = Array.from(tablesUsed)[0] || tableName;
    const otherTables = Array.from(tablesUsed).filter(
      (table) => table !== mainTable
    );

    let joinClauses = "";
    let additionalConditions = [];

    const policyTable = mockTables.find((t) => t.name === tableName);

    otherTables.forEach((table) => {
      const relationship = findRelationship(mainTable, table);
      if (relationship) {
        joinClauses += `JOIN ${table} ON ${table}.${relationship.foreign_key_column} = ${mainTable}.${relationship.column}\n    `;
      }
    });

    // Add condition to link back to the policy table if it's not the main table
    if (mainTable !== tableName) {
      const relationship = findRelationship(mainTable, tableName);
      if (relationship) {
        additionalConditions.push(
          `${mainTable}.${relationship.column} = ${tableName}.${relationship.foreign_key_column}`
        );
      }
    }

    const usingClause = policyExpression
      ? `USING (
      EXISTS (
        SELECT 1
        FROM ${mainTable}
        ${joinClauses}WHERE ${[...additionalConditions, policyExpression].join(
          " AND "
        )}
      )
    )`
      : "USING (TRUE)";

    return `CREATE POLICY "${policyName}"
ON ${tableName}
AS ${policyType.toUpperCase()}
FOR ${operationsString}
TO authenticated
${usingClause};`;
  };

  // Helper function to find the relationship between two tables
  const findRelationship = (
    table1: string,
    table2: string
  ): Relationship | null => {
    const table1Data = mockTables.find((t) => t.name === table1);
    const table2Data = mockTables.find((t) => t.name === table2);

    if (table1Data) {
      const relationship = table1Data.relationships.find(
        (r) => r.foreign_key_table === table2
      );
      if (relationship) return relationship;
    }

    if (table2Data) {
      const relationship = table2Data.relationships.find(
        (r) => r.foreign_key_table === table1
      );
      if (relationship)
        return {
          ...relationship,
          foreign_key_table: table1,
          column: relationship.foreign_key_column,
          foreign_key_column: relationship.column,
        };
    }

    return null;
  };

  const renderCondition = (
    condition: Condition,
    group: Group,
    index: number
  ) => (
    <div key={condition.id} className="flex items-center space-x-2 mb-2">
      {index > 0 && (
        <Select
          value={group.type}
          onValueChange={(value) => updateItem(group, "type", value)}
        >
          <SelectTrigger className="w-[80px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">AND</SelectItem>
            <SelectItem value="OR">OR</SelectItem>
          </SelectContent>
        </Select>
      )}
      <Select
        value={condition.leftTable}
        onValueChange={(value) => updateItem(condition, "leftTable", value)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Select table" />
        </SelectTrigger>
        <SelectContent>
          {mockTables.map((table) => (
            <SelectItem
              key={table.name}
              value={table.name}
            >{`${table.schema}.${table.name}`}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={condition.leftColumn}
        onValueChange={(value) => updateItem(condition, "leftColumn", value)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Select column" />
        </SelectTrigger>
        <SelectContent>
          {mockTables
            .find((t) => t.name === condition.leftTable)
            ?.columns.map((column) => (
              <SelectItem key={column.name} value={column.name}>
                {column.name}
                {column.is_primary_key && " (PK)"}
                {column.is_foreign_key && " (FK)"}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <Select
        value={condition.operator}
        onValueChange={(value) => updateItem(condition, "operator", value)}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="=">=</SelectItem>
          <SelectItem value="<>">≠</SelectItem>
          <SelectItem value=">">{">"}</SelectItem>
          <SelectItem value="<">{"<"}</SelectItem>
          <SelectItem value=">=">≥</SelectItem>
          <SelectItem value="<=">≤</SelectItem>
          <SelectItem value="IN">IN</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={condition.rightType}
        onValueChange={(value: "column" | "value" | "function") =>
          updateItem(condition, "rightType", value)
        }
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="column">Column</SelectItem>
          <SelectItem value="value">Value</SelectItem>
          <SelectItem value="function">Function</SelectItem>
        </SelectContent>
      </Select>
      {condition.rightType === "column" && (
        <>
          <Select
            value={condition.rightTable}
            onValueChange={(value) =>
              updateItem(condition, "rightTable", value)
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select table" />
            </SelectTrigger>
            <SelectContent>
              {mockTables.map((table) => (
                <SelectItem
                  key={table.name}
                  value={table.name}
                >{`${table.schema}.${table.name}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={condition.rightColumn}
            onValueChange={(value) =>
              updateItem(condition, "rightColumn", value)
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {mockTables
                .find((t) => t.name === condition.rightTable)
                ?.columns.map((column) => (
                  <SelectItem key={column.name} value={column.name}>
                    {column.name}
                    {column.is_primary_key && " (PK)"}
                    {column.is_foreign_key && " (FK)"}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </>
      )}
      {condition.rightType === "value" && (
        <Input
          className="w-[300px]"
          value={condition.rightValue || ""}
          onChange={(e) => updateItem(condition, "rightValue", e.target.value)}
          placeholder="Enter value"
        />
      )}
      {condition.rightType === "function" && (
        <Select
          value={condition.rightFunction}
          onValueChange={(value) =>
            updateItem(condition, "rightFunction", value)
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Select function" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auth.uid()">auth.uid()</SelectItem>
          </SelectContent>
        </Select>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => removeItem(condition)}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );

  const renderGroup = (group: Group, depth = 0) => (
    <Card key={group.id} className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="mr-2">Group (Depth: {depth})</CardTitle>
        <div className="flex items-center">
          {depth > 0 && (
            <Select
              value={group.type}
              onValueChange={(value) => updateItem(group, "type", value)}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND</SelectItem>
                <SelectItem value="OR">OR</SelectItem>
              </SelectContent>
            </Select>
          )}
          {depth > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeItem(group)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {group.items.map((item, i) =>
          "items" in item
            ? renderGroup(item, depth + 1)
            : renderCondition(item, group, i)
        )}
        <div className="flex space-x-2 mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addCondition(group)}
          >
            <PlusCircle className="w-4 h-4 mr-1" /> Add Condition
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addGroup(group)}
          >
            <PlusCircle className="w-4 h-4 mr-1" /> Add Group
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  useEffect(() => {
    const policy = generatePolicy();

    if (policy.trim() === "") {
      setFormattedPolicy(""); // Set empty string if policy is empty
    } else {
      try {
        const formatted = format(policy, { language: "postgresql" });
        setFormattedPolicy(formatted);
      } catch (error) {
        console.error("Error formatting SQL:", error);
        setFormattedPolicy(policy); // Use unformatted policy if formatting fails
      }
    }
  }, [rootGroup, policyName, tableName, operations, policyType]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create RLS Policy</CardTitle>
        <CardDescription>
          Define a new Row Level Security policy with flexible conditions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="policy-name">Policy Name</Label>
            <Input
              id="policy-name"
              value={policyName}
              onChange={(e) => setPolicyName(e.target.value)}
              placeholder="e.g., org_members_access_projects"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="table-name">Table Name</Label>
            <Select value={tableName} onValueChange={setTableName}>
              <SelectTrigger id="table-name">
                <SelectValue placeholder="Select a table" />
              </SelectTrigger>
              <SelectContent>
                {mockTables.map((table) => (
                  <SelectItem
                    key={table.name}
                    value={table.name}
                  >{`${table.schema}.${table.name}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Policy Type</Label>
            <RadioGroup
              defaultValue="permissive"
              onValueChange={(value) =>
                setPolicyType(value as "permissive" | "restrictive")
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="permissive" id="permissive" />
                <Label htmlFor="permissive">Permissive</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="restrictive" id="restrictive" />
                <Label htmlFor="restrictive">Restrictive</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Operations</Label>
            <div className="flex flex-wrap gap-4">
              {(Object.keys(operations) as Operation[]).map((op) => (
                <div key={op} className="flex items-center space-x-2">
                  <Checkbox
                    id={op}
                    checked={operations[op]}
                    onCheckedChange={() => handleOperationChange(op)}
                  />
                  <Label htmlFor={op}>{op}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Conditions</Label>
            {renderGroup(rootGroup)}
          </div>

          <div className="space-y-2">
            <Label>Current Policy</Label>
            <pre className="bg-foreground text-white text-xs p-4 rounded-md overflow-x-auto">
              <code>
                {formattedPolicy ||
                  "Please fill in all required fields to generate the policy."}
              </code>
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
