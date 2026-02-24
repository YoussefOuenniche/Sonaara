"use client";

import { useEffect, useRef, useState } from "react";

interface EmbedController {
  loadUri: (uri: string) => void;
  play: () => void;
  pause: () => void;
  addListener: (event: string, cb: (data: unknown) => void) => void;
  removeListener: (event: string) => void;
  destroy: () => void;
}

interface SpotifyIFrameAPI {
  createController: (
    element: HTMLElement,
    options: { uri: string; width: string | number; height: string | number },
    callback: (controller: EmbedController) => void
  ) => void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void;
    SpotifyIframeApi?: SpotifyIFrameAPI;
  }
}

export function useSpotifyEmbed() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<EmbedController | null>(null);
  const pendingUriRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    function initController(IFrameAPI: SpotifyIFrameAPI) {
      const el = containerRef.current;
      if (!el || controllerRef.current) return;

      IFrameAPI.createController(
        el,
        // Placeholder URI — gets replaced by the first loadUri() call
        { uri: "spotify:track:4iV5W9uYEdYUVa79Axb7Rh", width: "100%", height: 80 },
        (ctrl) => {
          controllerRef.current = ctrl;
          setIsReady(true);

          ctrl.addListener("playback_update", (data) => {
            const d = (data as { data?: { isPaused?: boolean } })?.data;
            if (d !== undefined) setIsPlaying(!d.isPaused);
          });

          // Play any URI that was requested before the controller was ready
          if (pendingUriRef.current) {
            ctrl.loadUri(pendingUriRef.current);
            ctrl.play();
            pendingUriRef.current = null;
          }
        }
      );
    }

    // If the IFrame API script was already loaded (e.g. hot-reload), init immediately
    if (window.SpotifyIframeApi) {
      initController(window.SpotifyIframeApi);
    } else {
      window.onSpotifyIframeApiReady = initController;

      if (!document.getElementById("spotify-embed-api")) {
        const script = document.createElement("script");
        script.id = "spotify-embed-api";
        script.src = "https://open.spotify.com/embed/iframe-api/v1";
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
      setIsReady(false);
      setIsPlaying(false);
    };
  }, []);

  /** Load and immediately begin playing a track URI. */
  function loadAndPlay(uri: string) {
    const ctrl = controllerRef.current;
    if (!ctrl) {
      pendingUriRef.current = uri;
      return;
    }
    ctrl.loadUri(uri);
    ctrl.play();
  }

  function pause() {
    controllerRef.current?.pause();
  }

  function togglePlay() {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    if (isPlaying) ctrl.pause();
    else ctrl.play();
  }

  return { containerRef, isReady, isPlaying, loadAndPlay, pause, togglePlay };
}
