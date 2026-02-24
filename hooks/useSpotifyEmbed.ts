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
  // Interval that retries play() while the new track is buffering.
  // Cleared as soon as isPaused:false is received or pause() is called.
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  function clearRetry() {
    if (retryIntervalRef.current !== null) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
  }

  useEffect(() => {
    // Create the hidden container once — lives in document.body so it exists
    // regardless of which React phase is currently rendered.
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
            setIsPlaying(!d.isPaused);

            // Once the track is actually playing, stop retrying.
            if (!d.isPaused) clearRetry();
          });

          // Play any URI that was requested before the controller was ready
          if (pendingUriRef.current) {
            const uri = pendingUriRef.current;
            pendingUriRef.current = null;
            startPlayback(ctrl, uri);
          }
        }
      );
    }

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
      clearRetry();
      controllerRef.current?.destroy();
      controllerRef.current = null;
      if (container.parentNode) container.parentNode.removeChild(container);
      setIsReady(false);
      setIsPlaying(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load a URI and keep retrying play() every 300 ms until the track is
  // actually playing (isPaused:false) — handles both the "stopping old track"
  // and "buffering new track" isPaused:true events that Spotify fires.
  // Gives up after 10 attempts (~3 s) to avoid running forever.
  function startPlayback(ctrl: EmbedController, uri: string) {
    clearRetry();
    ctrl.loadUri(uri);
    ctrl.play();
    let attempts = 0;
    retryIntervalRef.current = setInterval(() => {
      attempts++;
      ctrl.play();
      if (attempts >= 10) clearRetry();
    }, 300);
  }

  function loadAndPlay(uri: string) {
    const ctrl = controllerRef.current;
    if (!ctrl) {
      pendingUriRef.current = uri;
      return;
    }
    startPlayback(ctrl, uri);
  }

  function pause() {
    clearRetry();
    controllerRef.current?.pause();
  }

  function togglePlay() {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    if (isPlaying) {
      clearRetry();
      ctrl.pause();
    } else {
      ctrl.play();
    }
  }

  // Call during a user gesture to unlock browser autoplay for the iframe.
  // The placeholder track plays briefly; loadAndPlay() will switch it.
  function prime() {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    ctrl.play();
  }

  return { isReady, isPlaying, loadAndPlay, pause, togglePlay, prime };
}
