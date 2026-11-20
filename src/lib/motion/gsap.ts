"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

let registered = false;
if (typeof window !== "undefined" && !registered) {
  gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
  gsap.defaults({ ease: "power3.out", duration: 0.9 });
  registered = true;
}

export { gsap, ScrollTrigger, SplitText, useGSAP };

/** Marks a gated element as handled by the motion engine (see globals.css reveal gating). */
export function markReady(el: Element | null | undefined) {
  el?.setAttribute("data-reveal-ready", "");
}
