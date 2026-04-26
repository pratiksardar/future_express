/**
 * Widget layout — minimal shell for iframe-embeddable prediction market widgets.
 * Overrides the root layout's body padding/background so the widget fills
 * the full 300×200 iframe with no extra chrome.
 */
export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: "300px",
        height: "200px",
        overflow: "hidden",
        // Reset body-level styles applied by RootLayout
        margin: 0,
        padding: 0,
      }}
    >
      {children}
    </div>
  );
}
