"use client";

import React, { useState, useEffect } from "react";
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
import { generateRLSPolicy } from "../rls-policy-generator";
import { Group, Condition } from "../types/types";
import { mockTables } from "../mocks/mockTables";
import { cn } from "@/lib/utils";

type Operation = "SELECT" | "INSERT" | "UPDATE" | "DELETE";

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
    setRootGroup((prevRoot: Group) => ({
      ...prevRoot,
      items:
        prevRoot.id === group.id
          ? [...prevRoot.items, newCondition]
          : prevRoot.items.map((item: Condition | Group) =>
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
    setRootGroup((prevRoot: Group) => ({
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
        items: group.items.map((i: Condition | Group) =>
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

    setRootGroup((prevRoot: Group) => updateNestedGroup(prevRoot));
  };

  const removeItem = (itemToRemove: Condition | Group) => {
    const removeItemFromGroup = (group: Group): Group => {
      return {
        ...group,
        items: group.items
          .filter((item: Condition | Group) => item.id !== itemToRemove.id)
          .map((item: Condition | Group) =>
            "items" in item ? removeItemFromGroup(item) : item
          ),
      };
    };

    setRootGroup((prevRoot: Group) => removeItemFromGroup(prevRoot));
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
    <Card
      key={group.id}
      className={cn(
        "mb-4",
        depth <= 0 ? "border-none shadow-none p-0" : "bg-muted rounded-sm p-0"
      )}
    >
      {depth > 0 && (
        <>
          <CardHeader className="flex flex-row items-center justify-between p-3">
            <CardTitle className="mr-2">Group (Depth: {depth})</CardTitle>
            <div className="flex items-center">
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeItem(group)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
        </>
      )}
      <CardContent className={cn(depth <= 0 ? "p-0" : "p-2")}>
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
            onClick={() => addGroup()}
          >
            <PlusCircle className="w-4 h-4 mr-1" /> Add Group
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  useEffect(() => {
    const policy = generateRLSPolicy({
      policyName,
      tableName,
      policyType,
      operations,
      rootGroup,
      tables: mockTables,
    });

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
            <pre className="bg-foreground text-background text-xs p-4 rounded-md overflow-x-auto">
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
