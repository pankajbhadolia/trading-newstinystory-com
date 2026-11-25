import Link from "next/link";
import { calculators, type CalculatorDefinition } from "@/modules/calculators/calculations";
import { calculatorGuides } from "@/modules/calculators/guides";

export function CalculatorGuide({ calculator }: { calculator: CalculatorDefinition }) {
  const guide = calculatorGuides[calculator.id];
  return <article className="education-content calculator-guide">
    <h2>About the {calculator.title}</h2>
    <p>{guide.purpose}</p>
    <h2>Formula and methodology</h2>
    <p>{guide.methodology}</p>
    <h2>Example calculation</h2>
    <p>{guide.example}</p>
    <h2>Common mistakes</h2>
    <ul>{guide.mistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}</ul>
    <h2>Frequently asked questions</h2>
    {guide.questions.map((item) => <section key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></section>)}
    <h2>Related calculators</h2>
    <ul>{guide.related.map((id) => {
      const related = calculators.find((item) => item.id === id);
      if (!related) throw new Error(`Unknown related calculator: ${id}`);
      return <li key={id}><Link href={related.href}>{related.title}</Link></li>;
    })}</ul>
    <p className="education-disclaimer">Educational examples only, not financial advice or a promise of returns. Trading can result in loss of capital; losses may exceed the amount committed. Check all assumptions and applicable charges independently.</p>
  </article>;
}
