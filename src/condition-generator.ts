import { Condition, Group } from "./types/types";

export function generateConditionSQL(group: Group): string {
  const conditions = group.items.map((item) =>
    "type" in item
      ? `(${generateConditionSQL(item)})`
      : generateSingleCondition(item)
  );
  return conditions.join(` ${group.type} `);
}

function generateSingleCondition(condition: Condition): string {
  const {
    leftTable,
    leftColumn,
    operator,
    rightType,
    rightTable,
    rightColumn,
    rightFunction,
    rightValue,
  } = condition;
  const leftPart = `${leftTable}.${leftColumn}`;
  let rightPart: string;

  switch (rightType) {
    case "column":
      rightPart = `${rightTable}.${rightColumn}`;
      break;
    case "function":
      rightPart = rightFunction!;
      break;
    case "value":
      rightPart = `'${rightValue}'`;
      break;
    default:
      throw new Error(`Unknown right type: ${rightType}`);
  }

  return `${leftPart} ${operator} ${rightPart}`;
}
