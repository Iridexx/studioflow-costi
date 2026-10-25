import type { Block, Inline } from "@/modules/agreement/render";

function Text({ content }: { content: Inline[] }) {
  return content.map((part, index) =>
    part.kind === "bold" ? (
      <strong key={index}>{part.text}</strong>
    ) : part.kind === "missing" ? (
      <mark key={index} className="rounded bg-amber-100 px-1 text-amber-900 print:bg-transparent">
        [{part.text}]
      </mark>
    ) : (
      <span key={index}>{part.text}</span>
    ),
  );
}

// Testo dell'accordo con i dati dei soci; i dati mancanti sono evidenziati tra parentesi quadre.
export function AgreementText({ blocks }: { blocks: Block[] }) {
  return (
    <article className="space-y-3 text-sm leading-relaxed text-slate-800">
      {blocks.map((block, index) => {
        if (block.kind === "rule") return <hr key={index} className="border-slate-200" />;
        if (block.kind === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List
              key={index}
              className={`space-y-1 pl-6 ${block.ordered ? "list-decimal" : "list-disc"}`}
            >
              {block.items.map((item, i) => (
                <li key={i}>
                  <Text content={item} />
                </li>
              ))}
            </List>
          );
        }
        if (block.kind === "heading") {
          if (block.level === 1)
            return (
              <h2 key={index} className="text-xl font-semibold text-slate-900">
                <Text content={block.content} />
              </h2>
            );
          if (block.level === 2)
            return (
              <h3 key={index} className="pt-3 text-base font-semibold text-slate-900">
                <Text content={block.content} />
              </h3>
            );
          return (
            <h4 key={index} className="pt-1 font-semibold text-slate-900">
              <Text content={block.content} />
            </h4>
          );
        }
        return (
          <p key={index}>
            <Text content={block.content} />
          </p>
        );
      })}
    </article>
  );
}
