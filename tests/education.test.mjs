import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculate, calculators } from "../src/modules/calculators/calculations.ts";
import { calculatorGuides } from "../src/modules/calculators/guides.ts";
import { educationSchema } from "../src/modules/education/content-schema.ts";

const data = JSON.parse(readFileSync(new URL("../content/education.json", import.meta.url), "utf8"));

test("calculator guides cover every calculator and their examples match the calculation engine", () => {
  const ids = new Set(calculators.map((calculator) => calculator.id));
  assert.deepEqual(new Set(Object.keys(calculatorGuides)), ids);
  for (const calculator of calculators) {
    const guide = calculatorGuides[calculator.id];
    assert.ok(guide.purpose && guide.methodology && guide.example);
    assert.ok(guide.mistakes.length && guide.questions.length && guide.related.length);
    assert.equal(calculate(calculator.id, guide.exampleValues, guide.exampleDirection).value, guide.expected, calculator.id);
    for (const id of guide.related) assert.ok(ids.has(id) && id !== calculator.id, `${calculator.id}: ${id}`);
  }
});

test("published content validates and its calculator links resolve", () => {
  const parsed = educationSchema.parse(data);
  const ids = new Set(calculators.map((calculator) => calculator.id));
  for (const article of parsed.articles) for (const id of article.relatedCalculators) assert.ok(ids.has(id), id);
  for (const category of parsed.categories) assert.ok(parsed.articles.some((article) => article.category === category.slug), category.slug);
});

test("content rejects duplicate paths, unknown categories and unsafe slugs", () => {
  const duplicate = structuredClone(data);
  duplicate.articles.push(duplicate.articles[0]);
  assert.equal(educationSchema.safeParse(duplicate).success, false);
  const unknown = structuredClone(data);
  unknown.articles[0].category = "missing";
  assert.equal(educationSchema.safeParse(unknown).success, false);
  const unsafe = structuredClone(data);
  unsafe.articles[0].slug = "../other";
  assert.equal(educationSchema.safeParse(unsafe).success, false);
});
