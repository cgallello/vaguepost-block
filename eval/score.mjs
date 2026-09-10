import { readFileSync } from "node:fs";

const [datasetPath = "eval/dataset.json", predictionsPath = "eval/predictions.json"] = process.argv.slice(2);
const minimumCounts = { vague: 250, understandable: 250, contextual: 250, edge: 100 };

function readJson(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { throw new Error(`Cannot read ${path}: ${error.message}`); }
}

function validateDataset(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("Dataset must be a non-empty array");
  const ids = new Set();
  for (const row of rows) {
    if (!row || typeof row.id !== "string" || ids.has(row.id)) throw new Error("Dataset IDs must be unique strings");
    if (!Object.hasOwn(minimumCounts, row.label)) throw new Error(`Unsupported dataset label for ${row.id}`);
    if (typeof row.added !== "string" || typeof row.quote !== "string") throw new Error(`Missing sanitized text fields for ${row.id}`);
    ids.add(row.id);
  }
  return rows;
}

function score(dataset, predictions, threshold = 0.9) {
  const byId = new Map(predictions.map((prediction) => [prediction.id, prediction]));
  const counts = Object.fromEntries(Object.keys(minimumCounts).map((label) => [label, dataset.filter((row) => row.label === label).length]));
  let truePositive = 0; let falsePositive = 0; let falseNegative = 0; let trueNegative = 0;
  for (const row of dataset) {
    const prediction = byId.get(row.id);
    const predictedVague = prediction?.isVague === true && Number(prediction.confidence) >= threshold;
    const actualVague = row.label === "vague";
    if (predictedVague && actualVague) truePositive += 1;
    else if (predictedVague) falsePositive += 1;
    else if (actualVague) falseNegative += 1;
    else trueNegative += 1;
  }
  const precision = truePositive + falsePositive ? truePositive / (truePositive + falsePositive) : 0;
  const recall = truePositive + falseNegative ? truePositive / (truePositive + falseNegative) : 0;
  return { threshold, counts, truePositive, falsePositive, falseNegative, trueNegative, precision, recall, eligible: Object.entries(minimumCounts).every(([label, minimum]) => counts[label] >= minimum) && precision >= 0.95 };
}

const dataset = validateDataset(readJson(datasetPath));
const predictions = readJson(predictionsPath);
if (!Array.isArray(predictions)) throw new Error("Predictions must be an array");
const result = score(dataset, predictions, Number(process.env.VAGUEBLOCK_EVAL_THRESHOLD || 0.9));
console.log(JSON.stringify(result, null, 2));
if (process.argv.includes("--strict") && !result.eligible) process.exitCode = 1;
