import { generateConditionSQL } from "./condition-generator";
import {
  PolicyInput,
  Group,
  Condition,
  Table,
  Relationship,
} from "./types/types";

export function generateRLSPolicy(input: PolicyInput): string {
  console.log("Generating policy with input:", JSON.stringify(input, null, 2));

  const { policyName, tableName, policyType, operations, rootGroup, tables } =
    input;

  const conditions = generateConditionSQL(rootGroup);
  const joinClause = generateJoinClause(rootGroup, tables, tableName);

  const operationsString = Object.entries(operations)
    .filter(([, value]) => value)
    .map(([key]) => key.toUpperCase())
    .join(", ");

  const policySQL = `CREATE POLICY "${policyName}" ON ${tableName} AS ${policyType.toUpperCase()} FOR ${operationsString} TO authenticated USING (EXISTS (SELECT 1 FROM ${joinClause} WHERE ${conditions}));`;

  console.log("Generated policy:", policySQL);
  return policySQL;
}

function generateJoinClause(
  group: Group,
  tables: Table[],
  tableName: string
): string {
  const usedTables = new Set<string>();
  const joins: string[] = [];

  function processItem(item: Group | Condition) {
    if ("type" in item) {
      item.items.forEach(processItem);
    } else {
      usedTables.add(item.leftTable);
      if (item.rightType === "column") {
        usedTables.add(item.rightTable!);
      }
    }
  }

  processItem(group);

  const baseTable = Array.from(usedTables)[0];
  usedTables.delete(baseTable);

  if (baseTable !== tableName) {
    const relationship = findRelationship(tables, baseTable, tableName);
    if (relationship) {
      joins.push(
        `JOIN ${tableName} ON ${tableName}.${relationship.target_column_name} = ${baseTable}.${relationship.source_column_name}`
      );
    }
  }

  for (const table of Array.from(usedTables)) {
    if (table !== tableName) {
      const relationship = findRelationship(tables, tableName, table);
      if (relationship) {
        joins.push(
          `JOIN ${table} ON ${table}.${relationship.target_column_name} = ${tableName}.${relationship.source_column_name}`
        );
      }
    }
  }

  return `${baseTable}${joins.length > 0 ? " " + joins.join(" ") : ""}`;
}

function findRelationship(
  tables: Table[],
  sourceTable: string,
  targetTable: string
): Relationship | undefined {
  for (const table of tables) {
    if (table.name === sourceTable || table.name === targetTable) {
      const relationship = table.relationships.find(
        (r) =>
          (r.source_table_name === sourceTable &&
            r.target_table_name === targetTable) ||
          (r.source_table_name === targetTable &&
            r.target_table_name === sourceTable)
      );
      if (relationship) {
        if (relationship.source_table_name === sourceTable) {
          return relationship;
        } else {
          return {
            ...relationship,
            source_table_name: relationship.target_table_name,
            target_table_name: relationship.source_table_name,
            source_column_name: relationship.target_column_name,
            target_column_name: relationship.source_column_name,
          };
        }
      }
    }
  }
  return undefined;
}

// Remove the local definitions of generateConditionSQL and generateJoinSQL
