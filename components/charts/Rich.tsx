/**
 * Renders a dictionary sentence whose emphasis is marked `**like this**`.
 * The figures stay in the sentence the language wrote, and only their weight
 * changes; nothing here builds markup from user data, so a category called
 * "**x**" just reads with its asterisks.
 */
export function Rich({ text }: { text: string }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <b key={i} className="font-semibold text-text">
            {part}
          </b>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
