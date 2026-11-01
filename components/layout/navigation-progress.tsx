"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

// Signal de départ partagé : clic sur un lien interne ou navigation par le routeur (voir useProgressRouter)
const START_EVENT = "rodiq:navigation-start";

// URL interne vers une autre page que la page actuelle (un simple changement d'ancre ne charge rien)
const isPageChange = (href: string) => {
  const target = new URL(href, window.location.href);
  return (
    target.origin === window.location.origin &&
    (target.pathname !== window.location.pathname || target.search !== window.location.search)
  );
};

export const startNavigationProgress = (href: string) => {
  if (isPageChange(href)) window.dispatchEvent(new Event(START_EVENT));
};

// Délai avant d'afficher la barre : une page déjà préchargée s'ouvre sans clignotement
const SHOW_DELAY = 120;
const TRICKLE_INTERVAL = 200;

const ProgressBar = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const url = `${pathname}?${searchParams}`;
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const loading = useRef(false);
  const timers = useRef<{ show?: number; trickle?: number; hide?: number }>({});

  const clearTimers = () => {
    window.clearTimeout(timers.current.show);
    window.clearInterval(timers.current.trickle);
    window.clearTimeout(timers.current.hide);
  };

  // Départ : la barre avance vers 90 % de plus en plus lentement, tant que la page n'est pas arrivée
  useEffect(() => {
    const start = () => {
      clearTimers();
      loading.current = true;
      setProgress(8);
      timers.current.show = window.setTimeout(() => setVisible(true), SHOW_DELAY);
      timers.current.trickle = window.setInterval(
        () => setProgress((p) => p + (90 - p) * 0.08),
        TRICKLE_INTERVAL
      );
    };

    // Clic sur un lien interne ouvert dans l'onglet courant (pas de nouvel onglet ni de téléchargement)
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;
      if (isPageChange(link.href)) start();
    };

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener(START_EVENT, start);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener(START_EVENT, start);
      clearTimers();
    };
  }, []);

  // Arrivée : l'URL a changé, la barre se remplit puis s'efface
  useEffect(() => {
    if (!loading.current) return;
    loading.current = false;
    clearTimers();
    setProgress(100);
    timers.current.hide = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  }, [url]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="h-full bg-rosewood shadow-[0_0_8px_var(--color-blush)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

// Barre de chargement en haut de l'écran pendant un changement de page (utile sur une connexion lente)
export const NavigationProgress = () => (
  <Suspense fallback={null}>
    <ProgressBar />
  </Suspense>
);
