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
  const controllerRef = useRef<EmbedController | null>(null);
  const pendingUriRef = useRef<string | null>(null);
  // Whether we *want* the player playing. Used to retry play() after loadUri
  // causes a transient isPaused:true while the new track buffers.
  const wantsPlayRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Create the container element directly in document.body so it is always
    // present in the DOM regardless of which React phase (prompt vs cards) is
    // currently rendered.  If we relied on a ref that is only attached in the
    // cards phase, onSpotifyIframeApiReady could fire while the ref is null and
    // the controller would never be created.
    const container = document.createElement("div");
    container.setAttribute("aria-hidden", "true");
    container.style.cssText =
      "position:fixed;bottom:0;left:-9999px;width:300px;height:80px;";
    document.body.appendChild(container);

    function initController(IFrameAPI: SpotifyIFrameAPI) {
      if (controllerRef.current) return;

      IFrameAPI.createController(
        container,
        { uri: "spotify:track:4iV5W9uYEdYUVa79Axb7Rh", width: "100%", height: 80 },
        (ctrl) => {
          controllerRef.current = ctrl;
          setIsReady(true);

          ctrl.addListener("playback_update", (data) => {
            const d = (data as { data?: { isPaused?: boolean } })?.data;
            if (d === undefined) return;
            const paused = !!d.isPaused;
            setIsPlaying(!paused);
            // If the player went paused while we still want playback (e.g.
            // Spotify briefly pauses when loadUri switches tracks), retry play().
            if (paused && wantsPlayRef.current) {
              ctrl.play();
            }
          });

          // Play any URI that was requested before the controller was ready
          if (pendingUriRef.current) {
            wantsPlayRef.current = true;
            ctrl.loadUri(pendingUriRef.current);
            ctrl.play();
            pendingUriRef.current = null;
          }
        }
      );
    }

    // If the IFrame API was already loaded (e.g. HMR / hot-reload), init immediately
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
      wantsPlayRef.current = false;
      if (container.parentNode) container.parentNode.removeChild(container);
      setIsReady(false);
      setIsPlaying(false);
    };
  }, []);

  function loadAndPlay(uri: string) {
    const ctrl = controllerRef.current;
    if (!ctrl) {
      pendingUriRef.current = uri;
      return;
    }
    wantsPlayRef.current = true;
    ctrl.loadUri(uri);
    ctrl.play();
  }

  function pause() {
    wantsPlayRef.current = false;
    controllerRef.current?.pause();
  }

  function togglePlay() {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    if (isPlaying) {
      wantsPlayRef.current = false;
      ctrl.pause();
    } else {
      wantsPlayRef.current = true;
      ctrl.play();
    }
  }

  // Call this during a user gesture (e.g. button click) to unlock browser
  // autoplay. The placeholder track plays briefly until the first real
  // loadAndPlay switches it.
  function prime() {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    wantsPlayRef.current = true;
    ctrl.play();
  }

  return { isReady, isPlaying, loadAndPlay, pause, togglePlay, prime };
}
