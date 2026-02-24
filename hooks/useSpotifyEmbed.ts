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
  const ctrlRef         = useRef<EmbedController | null>(null);
  const containerRef    = useRef<HTMLDivElement | null>(null);
  const initializingRef = useRef(false);
  const pendingUriRef   = useRef<string | null>(null);
  const isPlayingRef    = useRef(false);
  const userPausedRef   = useRef(false);
  const retryRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isReady,   setIsReady]   = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  function setPlaying(v: boolean) {
    isPlayingRef.current = v;
    setIsPlaying(v);
  }

  function clearRetry() {
    if (retryRef.current !== null) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }
  }

  useEffect(() => {
    // Create the hidden container that will host the Spotify embed iframe.
    const container = document.createElement("div");
    container.setAttribute("aria-hidden", "true");
    container.style.cssText =
      "position:fixed;bottom:0;left:-9999px;width:300px;height:80px;pointer-events:none;";
    document.body.appendChild(container);
    containerRef.current = container;

    // Preload the IFrame API script now so it is ready by the time the first
    // track needs to play — but do NOT create the controller yet.
    if (!window.SpotifyIframeApi && !document.getElementById("spotify-embed-api")) {
      const s = document.createElement("script");
      s.id = "spotify-embed-api";
      s.src = "https://open.spotify.com/embed/iframe-api/v1";
      s.async = true;
      document.body.appendChild(s);
    }

    return () => {
      clearRetry();
      ctrlRef.current?.destroy();
      ctrlRef.current = null;
      initializingRef.current = false;
      container.parentNode?.removeChild(container);
      containerRef.current = null;
      setIsReady(false);
      setPlaying(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function _doLoadAndPlay(ctrl: EmbedController, uri: string) {
    clearRetry();
    userPausedRef.current = false;
    ctrl.loadUri(uri);
    ctrl.play();
    // On mobile, play() may fire before Spotify has buffered the track.
    // Retry once at 300ms — skipped automatically if the track is already playing.
    retryRef.current = setTimeout(() => {
      retryRef.current = null;
      if (!userPausedRef.current && !isPlayingRef.current) {
        ctrl.play();
      }
    }, 300);
  }

  /**
   * Lazily create the Spotify IFrame controller using the first real track URI.
   * This means there is never a placeholder track that could play.
   */
  function _initController(uri: string) {
    if (initializingRef.current || ctrlRef.current || !containerRef.current) return;
    initializingRef.current = true;
    const container = containerRef.current;

    function doCreate(IFrameAPI: SpotifyIFrameAPI) {
      if (ctrlRef.current) return;
      IFrameAPI.createController(
        container,
        { uri, width: "100%", height: 80 },
        (ctrl) => {
          ctrlRef.current = ctrl;
          initializingRef.current = false;
          setIsReady(true);
          ctrl.addListener("playback_update", (raw) => {
            const d = (raw as { data?: { isPaused?: boolean } })?.data;
            if (d !== undefined) setPlaying(!d.isPaused);
          });
          // Play the most recently requested URI — may have changed while we
          // were waiting for the API / controller to initialise.
          const uriToPlay = pendingUriRef.current ?? uri;
          pendingUriRef.current = null;
          _doLoadAndPlay(ctrl, uriToPlay);
        }
      );
    }

    if (window.SpotifyIframeApi) {
      doCreate(window.SpotifyIframeApi);
    } else {
      const existing = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = (api) => {
        existing?.(api);
        doCreate(api);
      };
    }
  }

  /** Load a Spotify URI and start playing. Creates the controller on first call. */
  function loadAndPlay(uri: string | null) {
    if (!uri) return;
    const ctrl = ctrlRef.current;
    if (ctrl) {
      _doLoadAndPlay(ctrl, uri);
      return;
    }
    if (initializingRef.current) {
      // Controller is being created — remember the latest URI to play when ready.
      pendingUriRef.current = uri;
      return;
    }
    _initController(uri);
  }

  function pause() {
    clearRetry();
    userPausedRef.current = true;
    ctrlRef.current?.pause();
  }

  function togglePlay() {
    const ctrl = ctrlRef.current;
    if (!ctrl) return;
    if (isPlayingRef.current) {
      pause();
    } else {
      userPausedRef.current = false;
      ctrl.play();
    }
  }

  /**
   * Call synchronously inside a user-gesture handler (swipe/button press).
   * Extends sticky activation so the iframe keeps playing across async
   * track changes (useEffect, etc.) on older iOS.
   */
  function prime() {
    ctrlRef.current?.play();
  }

  return { isReady, isPlaying, loadAndPlay, pause, togglePlay, prime };
}
