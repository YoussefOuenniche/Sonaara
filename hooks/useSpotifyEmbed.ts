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
  // Set to true before every loadUri call so the playback_update listener
  // can fire play() exactly once if Spotify pauses while buffering the new
  // track. Cleared immediately on use to prevent any retry loop.
  const playOnLoadRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

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

            // One-shot retry: if Spotify reports paused right after a loadUri
            // (buffering the new track), fire play() once and clear the flag.
            // The flag is cleared BEFORE calling play() so even if that play()
            // triggers another isPaused event there is no second retry.
            if (d.isPaused && playOnLoadRef.current) {
              playOnLoadRef.current = false;
              ctrl.play();
            }
          });

          // Play any URI that was requested before the controller was ready
          if (pendingUriRef.current) {
            playOnLoadRef.current = true;
            ctrl.loadUri(pendingUriRef.current);
            ctrl.play();
            pendingUriRef.current = null;
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
      controllerRef.current?.destroy();
      controllerRef.current = null;
      playOnLoadRef.current = false;
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
    // Arm the one-shot retry, then load + play.  If play() is accepted
    // immediately the retry flag is cleared by the isPaused:false event
    // (which doesn't match the retry condition). If Spotify responds with
    // isPaused:true (buffering), the listener fires play() once more.
    playOnLoadRef.current = true;
    ctrl.loadUri(uri);
    ctrl.play();
  }

  function pause() {
    // Disarm the retry so a buffering pause doesn't auto-resume.
    playOnLoadRef.current = false;
    controllerRef.current?.pause();
  }

  function togglePlay() {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    if (isPlaying) {
      playOnLoadRef.current = false;
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
