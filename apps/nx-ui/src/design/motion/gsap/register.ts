// apps/nx-ui/src/design/motion/gsap/register.ts
// gsap.registerPlugin 入口；只在 client component 第一次 import 時跑。
// 規範見 docs/_team/animation-spec.md §3。
'use client';

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

export function ensureGsapRegistered(): void {
  if (registered) return;
  gsap.registerPlugin(useGSAP, ScrollTrigger);
  registered = true;
}

ensureGsapRegistered();

export { gsap, useGSAP, ScrollTrigger };
