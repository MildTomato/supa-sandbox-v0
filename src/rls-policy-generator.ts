import { generateConditionSQL, generateJoinSQL } from "./condition-generator";
import { PolicyInput } from "./types/types";

export function generateRLSPolicy(input: PolicyInput): string {
  console.log("Generating policy with input:", JSON.stringify(input, null, 2));

  const {
    policyName,
    tableName,
    policyType,
    operations,
    rootGroup,
    tables,
    finalCondition,
  } = input;

  const operationsString = Object.entries(operations)
    .filter(([, value]) => value)
    .map(([key]) => key.toUpperCase())
    .join(", ");

  const joinGroup = { ...rootGroup, items: [...rootGroup.items] };
  if (finalCondition) {
    joinGroup.items.push(finalCondition);
  }

  const joinClause = generateJoinSQL(joinGroup, tables);
  const whereClause = generateConditionSQL(rootGroup);
  const finalWhereClause = finalCondition
    ? ` AND ${generateConditionSQL(finalCondition)}`
    : "";

  const policy =
    `CREATE POLICY "${policyName}" ON ${tableName} AS ${policyType.toUpperCase()} FOR ${operationsString} TO authenticated USING (EXISTS (SELECT 1 FROM ${joinClause} WHERE ${whereClause}${finalWhereClause}));`
      .replace(/\s+/g, " ")
      .trim();

  console.log("Generated policy:", policy);

  return policy;
}

// Remove the local definitions of generateConditionSQL and generateJoinSQL
