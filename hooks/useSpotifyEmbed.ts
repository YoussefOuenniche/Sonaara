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

export function useAudioPlayer() {
  const ctrlRef     = useRef<EmbedController | null>(null);
  const pendingUri  = useRef<string | null>(null);
  const isPlayingRef = useRef(false);
  const [isReady,   setIsReady]   = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  function setPlaying(v: boolean) {
    isPlayingRef.current = v;
    setIsPlaying(v);
  }

  useEffect(() => {
    const container = document.createElement("div");
    container.setAttribute("aria-hidden", "true");
    container.style.cssText =
      "position:fixed;bottom:0;left:-9999px;width:300px;height:80px;pointer-events:none;";
    document.body.appendChild(container);

    function init(IFrameAPI: SpotifyIFrameAPI) {
      if (ctrlRef.current) return;
      IFrameAPI.createController(
        container,
        // Placeholder track — immediately replaced by the first loadAndPlay() call.
        { uri: "spotify:track:4iV5W9uYEdYUVa79Axb7Rh", width: "100%", height: 80 },
        (ctrl) => {
          ctrlRef.current = ctrl;
          setIsReady(true);
          ctrl.addListener("playback_update", (raw) => {
            const d = (raw as { data?: { isPaused?: boolean } })?.data;
            if (d !== undefined) setPlaying(!d.isPaused);
          });
          if (pendingUri.current) {
            const uri = pendingUri.current;
            pendingUri.current = null;
            ctrl.loadUri(uri);
            ctrl.play();
          }
        }
      );
    }

    if (window.SpotifyIframeApi) {
      init(window.SpotifyIframeApi);
    } else {
      window.onSpotifyIframeApiReady = init;
      if (!document.getElementById("spotify-embed-api")) {
        const s = document.createElement("script");
        s.id = "spotify-embed-api";
        s.src = "https://open.spotify.com/embed/iframe-api/v1";
        s.async = true;
        document.body.appendChild(s);
      }
    }

    return () => {
      ctrlRef.current?.destroy();
      ctrlRef.current = null;
      container.parentNode?.removeChild(container);
      setIsReady(false);
      setPlaying(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Load a Spotify URI and start playing. Queues if the controller isn't ready yet. */
  function loadAndPlay(uri: string | null) {
    if (!uri) return;
    const ctrl = ctrlRef.current;
    if (!ctrl) { pendingUri.current = uri; return; }
    ctrl.loadUri(uri);
    ctrl.play();
  }

  function pause() {
    ctrlRef.current?.pause();
  }

  function togglePlay() {
    const ctrl = ctrlRef.current;
    if (!ctrl) return;
    if (isPlayingRef.current) ctrl.pause(); else ctrl.play();
  }

  /**
   * Call synchronously inside a user-gesture handler.
   * Sends play() to the iframe, which — with the Spotify embed's built-in
   * allow="autoplay" delegation — establishes sticky activation so the iframe
   * can play from async contexts (useEffect, etc.) without another gesture.
   */
  function prime() {
    ctrlRef.current?.play();
  }

  return { isReady, isPlaying, loadAndPlay, pause, togglePlay, prime };
}
