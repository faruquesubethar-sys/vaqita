export default function Loading() {
  return (
    <div className="shell flex min-h-[70vh] items-center justify-center">
      {/* A single hairline that fills — quieter than a spinner, and it matches
          the rest of the interface. */}
      <div className="h-px w-40 overflow-hidden bg-bone/12">
        <div className="h-px w-1/3 animate-[vq-load_1.4s_ease-in-out_infinite] bg-brass" />
      </div>
      <style>{`@keyframes vq-load{0%{transform:translateX(-120%)}100%{transform:translateX(420%)}}`}</style>
    </div>
  );
}
