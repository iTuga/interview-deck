"use client";

import { useEffect, useReducer } from "react";
import { loadState, reducer, saveState } from "@/lib/state";
import InterviewView from "./InterviewView";
import ResultsView from "./ResultsView";
import SetupView from "./SetupView";

export default function InterviewApp() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.phase]);

  if (state.phase === "interview" && state.questions.length > 0) {
    return <InterviewView state={state} dispatch={dispatch} />;
  }
  if (state.phase === "results" && state.questions.length > 0) {
    return <ResultsView state={state} dispatch={dispatch} />;
  }
  return <SetupView state={state} dispatch={dispatch} />;
}
