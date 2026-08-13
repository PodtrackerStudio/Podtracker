/** The centered serif heading used above every landing page section. */
export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-center font-serif text-4xl sm:text-5xl">{children}</h2>
  );
}
