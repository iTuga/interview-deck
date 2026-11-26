"use client";

import dynamic from "next/dynamic";

// The app keeps its state in localStorage, so it renders only in the browser.
const InterviewApp = dynamic(() => import("./InterviewApp"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-zinc-200 border-t-indigo-600" />
    </div>
  ),
});

export default function ClientRoot() {
  return <InterviewApp />;
}
