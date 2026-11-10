# Motion system

`useAfterHoursMotion.ts` owns the homepage effects: a passive native scroll listener coalesced through requestAnimationFrame, bounded decorative depth translations, one-shot IntersectionObserver section reveals, and small pointer tilts. It removes listeners, observer, frames and inline transforms on cleanup. CSS handles press/hover feedback and the short entrance sequence. Existing Motion remains available for application transitions.

Chat has its own native scroll container. No scroll interception, smooth-scroll dependency, animated message arrival or 3D rendering loop is added. Decorative objects use CSS perspective and transforms; no WebGL/GPU-heavy canvas.

System prefers-reduced-motion and the stored application preference disable motion. Touch input does not tilt cards. Content remains present without JavaScript and sections are never hidden from keyboard navigation.

Reference choices: Wensity inspired depth and responsive physicality, not its agency structure. Motion (MIT) is already installed. Lenis, GSAP, React Three Fiber, motion-primitives and React Bits were considered as references but no code or dependencies were copied from them. A larger rendering stack was unnecessary for these effects.

Performance is not yet benchmarked for this revision: browser access was rejected. Existing audit artifacts predate this frontend and must not be presented as current results.
