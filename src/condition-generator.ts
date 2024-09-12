import { Group, Condition, Table } from "./types/types";

function generateSingleConditionSQL(condition: Condition): string {
  const leftSide = `${condition.leftTable}.${condition.leftColumn}`;
  let rightSide = "";

  switch (condition.rightType) {
    case "column":
      rightSide = `${condition.rightTable}.${condition.rightColumn}`;
      break;
    case "value":
      rightSide = `'${condition.rightValue}'`;
      break;
    case "function":
      rightSide = condition.rightFunction || "";
      break;
  }

  return `${leftSide} ${condition.operator} ${rightSide}`;
}

export function generateConditionSQL(condition: Condition | Group): string {
  if ("type" in condition) {
    const conditions = condition.items.map(generateConditionSQL);
    if (condition.type === "OR") {
      return `(${conditions.join(` ${condition.type} `)})`;
    }
    return conditions.join(` ${condition.type} `);
  } else {
    return generateSingleConditionSQL(condition);
  }
}

export function generateJoinSQL(group: Group, tables: Table[]): string {
  const usedTables = new Set<string>();

  function collectTables(item: Group | Condition) {
    if ("type" in item) {
      item.items.forEach(collectTables);
    } else {
      usedTables.add(item.leftTable);
      if (item.rightType === "column" && item.rightTable) {
        usedTables.add(item.rightTable);
      }
    }
  }

  collectTables(group);

  const tablesList = Array.from(usedTables);
  if (tablesList.length <= 1) return tablesList[0] || "";

  const joins: string[] = [];
  const processedTables = new Set<string>();

  function addJoin(sourceTable: string, targetTable: string) {
    const relationship = tables
      .find((t) => t.name === sourceTable)
      ?.relationships.find((r) => r.target_table_name === targetTable);

    if (relationship) {
      const joinCondition = `${relationship.target_table_name}.${relationship.target_column_name} = ${sourceTable}.${relationship.source_column_name}`;
      joins.push(`JOIN ${relationship.target_table_name} ON ${joinCondition}`);
      processedTables.add(targetTable);
    }
  }

  const mainTable = tablesList[0];
  processedTables.add(mainTable);

  for (const tableName of tablesList.slice(1)) {
    if (!processedTables.has(tableName)) {
      addJoin(mainTable, tableName);
    }
  }

  return `${mainTable} ${joins.join(" ")}`;
}
