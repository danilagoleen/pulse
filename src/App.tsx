import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "./components/Header";
import { SynthEngine } from "./audio/SynthEngine";
import { KeyDetector } from "./audio/KeyDetector";
import { BPMDetector } from "./audio/BPMDetector";
import { HandTracker, GestureState } from "./vision/HandTracker";
import { quantizeToScale, CAMELOT_KEYS, SCALE_COLORS } from "./music/theory";
import { Volume2, Hand, Camera, Square, MousePointer2, ArrowLeftRight, Mic, MicOff, Activity } from "lucide-react";

function App() {
  const [isReady, setIsReady] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isBPMTracking, setIsBPMTracking] = useState(false);
  const [detectedKey, setDetectedKey] = useState<string | null>(null);
  const [detectedNote, setDetectedNote] = useState<string | null>(null);
  const [detectedNotes, setDetectedNotes] = useState<string[]>([]);
  const [detectionScore, setDetectionScore] = useState<number>(0);
  const [currentBPM, setCurrentBPM] = useState<number>(0);
  const [beatPhase, setBeatPhase] = useState<number>(0);
  const [bpmConfidence, setBpmConfidence] = useState<number>(0);
  const [gestureState, setGestureState] = useState<GestureState>({
    leftHand: null,
    rightHand: null,
  });
  const [selectedScale, setSelectedScale] = useState('8B');
  const [currentNote, setCurrentNote] = useState<number | null>(null);
  const [currentFilter, setCurrentFilter] = useState<number>(0.5);
  const [isLeftHandNotes, setIsLeftHandNotes] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [beatSyncEnabled, setBeatSyncEnabled] = useState(true);
  const [playMode, setPlayMode] = useState<'legato' | 'arpeggio' | 'normal'>('normal');
  
  const [simY, setSimY] = useState(0.5);
  const [simX, setSimX] = useState(0.5);
  const [simPinch, setSimPinch] = useState(false);

  const synthRef = useRef<SynthEngine | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const keyDetectorRef = useRef<KeyDetector | null>(null);
  const bpmDetectorRef = useRef<BPMDetector | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const simIntervalRef = useRef<number | null>(null);
  const isLeftHandNotesRef = useRef(isLeftHandNotes);
  const beatPhaseRef = useRef(0);
  const isBPMTrackingRef = useRef(false);
  const pendingKeyRef = useRef<string | null>(null);
  const beatSyncEnabledRef = useRef(true);
  const playModeRef = useRef<'legato' | 'arpeggio' | 'normal'>('normal');

  const handleGesture = useCallback((state: GestureState) => {
    setGestureState(state);
    const isLeft = isLeftHandNotesRef.current;

    if (synthRef.current) {
      const notesHand = isLeft ? state.leftHand : state.rightHand;
      const filterHand = isLeft ? state.rightHand : state.leftHand;
      
      console.log(`[Gesture] isLeftHandNotes=${isLeft}, leftHand=${state.leftHand ? 'present' : 'null'}, rightHand=${state.rightHand ? 'present' : 'null'}`);
      
      // Filter hand: Y axis controls filter cutoff
      if (filterHand) {
        const filterY = filterHand.y;
        setCurrentFilter(filterY);
        synthRef.current.setFilterCutoff(filterY);
        console.log(`[Gesture] Filter hand Y: ${filterY.toFixed(2)} → cutoff`);
      }
      
      // Notes hand: X = pitch (left=low, right=high), Y = legato/arpeggio
      if (notesHand?.isPinching) {
        const normalizedX = notesHand.x;
        const normalizedY = notesHand.y;
        const midiNote = quantizeToScale(normalizedX, selectedScale);
        
        const isArpeggioMode = normalizedY < 0.4;
        const isLegatoMode = normalizedY > 0.6;
        const isMidRange = !isArpeggioMode && !isLegatoMode;
        
        const newMode: 'legato' | 'arpeggio' | 'normal' = isLegatoMode ? 'legato' : isArpeggioMode ? 'arpeggio' : 'normal';
        if (playModeRef.current !== newMode) {
          playModeRef.current = newMode;
          setPlayMode(newMode);
        }
        
        let shouldPlay = false;
        
        if (isLegatoMode) {
          shouldPlay = true;
        } else if (isMidRange) {
          shouldPlay = true;
        } else if (isArpeggioMode && isBPMTrackingRef.current) {
          const beatPhase = beatPhaseRef.current;
          const eighthNote = 0.25;
          
          const onEighth = beatPhase < eighthNote || (beatPhase > 0.5 && beatPhase < 0.5 + eighthNote);
          
          shouldPlay = onEighth;
        } else {
          shouldPlay = true;
        }
        
        console.log(`[Gesture] Pitch: X=${normalizedX.toFixed(2)}→M${midiNote}, Y=${normalizedY.toFixed(2)} mode=${isLegatoMode ? 'LEGATO' : isArpeggioMode ? 'ARP' : 'MID'} play=${shouldPlay}`);
        
        if (shouldPlay) {
          synthRef.current.start();
          setCurrentNote(midiNote);
          synthRef.current.setFrequencyFromMidi(midiNote);
          synthRef.current.setVolume(0.5);
        }
      } else {
        synthRef.current.stop();
        setCurrentNote(null);
      }
    }
  }, [selectedScale, isLeftHandNotes]);

  useEffect(() => {
    isLeftHandNotesRef.current = isLeftHandNotes;
    trackerRef.current?.setHandMode(isLeftHandNotes);
  }, [isLeftHandNotes]);

  useEffect(() => {
    synthRef.current = new SynthEngine();
    trackerRef.current = new HandTracker();
    trackerRef.current.setHandMode(isLeftHandNotes);
    keyDetectorRef.current = new KeyDetector();
    setIsReady(true);

    return () => {
      trackerRef.current?.dispose();
      keyDetectorRef.current?.stop();
      synthRef.current?.dispose();
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isSimulating && synthRef.current) {
      const noteX = isLeftHandNotes ? simX : 0.5;
      const filterY = isLeftHandNotes ? simY : 0.5;
      
      // Filter: Y axis
      synthRef.current.setFilterCutoff(filterY);
      setCurrentFilter(filterY);
      
      if (simPinch) {
        synthRef.current.start();
        
        // Pitch: X axis
        const midiNote = quantizeToScale(noteX, selectedScale);
        synthRef.current.setFrequencyFromMidi(midiNote);
        setCurrentNote(midiNote);
        synthRef.current.setVolume(0.5);
      } else {
        synthRef.current.stop();
        setCurrentNote(null);
      }
      
      setGestureState({
        leftHand: { x: isLeftHandNotes ? simX : 0.5, y: isLeftHandNotes ? simY : 0.5, z: 0, isPinching: false },
        rightHand: { x: isLeftHandNotes ? 0.5 : simX, y: isLeftHandNotes ? 0.5 : simY, z: 0, isPinching: simPinch },
      });
    }
  }, [isSimulating, simY, simX, simPinch, selectedScale, isLeftHandNotes]);

  const startTracking = async () => {
    if (!videoRef.current || !canvasRef.current || !trackerRef.current) {
      console.error("[App] Missing refs");
      return;
    }

    try {
      console.log("[App] Requesting camera permission...");
      
      // Check if permissions API is available
      if (navigator.permissions) {
        try {
          const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          console.log("[App] Camera permission state:", cameraPermission.state);
          cameraPermission.onchange = () => {
            console.log("[App] Camera permission changed:", cameraPermission.state);
          };
        } catch (e) {
          console.log("[App] Permissions query not supported");
        }
      }

      console.log("[App] Calling getUserMedia...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false
      });
      streamRef.current = stream;
      console.log("[App] Camera stream obtained:", stream.id);

      // Put stream on video element
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      console.log("[App] Video playing");

      console.log("[App] Starting hand tracking...");
      await trackerRef.current.initialize(
        videoRef.current,
        canvasRef.current,
        handleGesture
      );
      await trackerRef.current.start();
      console.log("[App] Tracking started");
      setIsTracking(true);
    } catch (error) {
      console.error("[App] Camera error:", error);
      alert("Camera error: " + (error as Error).message + "\n\nCheck System Preferences → Privacy → Camera");
    }
  };

  const stopTracking = async () => {
    trackerRef.current?.stop();
    
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsTracking(false);
    synthRef.current?.stop();
  };

  const startSimulation = () => {
    setIsSimulating(true);
    setIsTracking(false);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    synthRef.current?.stop();
    setGestureState({ leftHand: null, rightHand: null });
  };

  const handleTestSound = () => {
    synthRef.current?.triggerNote(440);
  };

  const toggleListening = async () => {
    if (isListening) {
      keyDetectorRef.current?.stop();
      setIsListening(false);
      setPendingKey(null);
    } else {
      setDetectedNote(null);
      setDetectedKey(null);
      setDetectedNotes([]);
      setDetectionScore(0);
      pendingKeyRef.current = null;
      await keyDetectorRef.current?.start((note: string, key: string, allNotes: string[], score: number) => {
        console.log("[KeyDetector] Detected:", note, "->", key, "notes:", allNotes, "score:", score);
        setDetectedNote(note);
        setDetectedKey(key);
        setDetectedNotes(allNotes);
        setDetectionScore(score);
        
        if (beatSyncEnabledRef.current && isBPMTrackingRef.current) {
          pendingKeyRef.current = key;
          setPendingKey(key);
          console.log("[KeyDetector] Key change queued for downbeat:", key);
        } else {
          setSelectedScale(key);
        }
      });
      setIsListening(true);
    }
  };

  const toggleBPM = async () => {
    if (isBPMTracking) {
      bpmDetectorRef.current?.stop();
      setIsBPMTracking(false);
      setCurrentBPM(0);
      setBeatPhase(0);
      setBpmConfidence(0);
      isBPMTrackingRef.current = false;
    } else {
      bpmDetectorRef.current = new BPMDetector();
      isBPMTrackingRef.current = true;
      beatPhaseRef.current = 0;
      await bpmDetectorRef.current.start((bpm, beat, confidence) => {
        beatPhaseRef.current = beat;
        setCurrentBPM(bpm);
        setBeatPhase(beat);
        setBpmConfidence(confidence);
        
        if (beat < 0.1 && pendingKeyRef.current) {
          const key = pendingKeyRef.current;
          console.log("[BPM] On downbeat - switching to:", key);
          setSelectedScale(key);
          setPendingKey(null);
          pendingKeyRef.current = null;
        }
      });
      setIsBPMTracking(true);
    }
  };

  return (
    <div 
      className="min-h-screen text-white transition-colors duration-300"
      style={{ 
        backgroundColor: '#000',
        borderLeft: `4px solid ${SCALE_COLORS[selectedScale] || '#45B7D1'}`
      }}
    >
      <Header />
      
      <main className="flex-1 flex flex-col items-center p-6">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-light mb-2">Day 2: Vision + Synthesis</h2>
          <p className="text-zinc-500 text-sm">MediaPipe Hands → Frequency (Theremin)</p>
        </div>

        <div className="relative w-[640px] h-[480px] bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
            autoPlay
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="absolute inset-0 w-full h-full"
          />

          {isSimulating && (
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/30 to-purple-900/30 pointer-events-none" />
          )}

          {!isTracking && !isSimulating && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center">
                <Camera className="w-12 h-12 mx-auto mb-4 text-zinc-500" />
                <p className="text-zinc-400 text-sm mb-4">Camera not active</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={startTracking}
                    disabled={!isReady}
                    className="flex items-center gap-2 px-6 py-3 bg-cyan-700 hover:bg-cyan-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    Start Camera
                  </button>
                  <button
                    onClick={startSimulation}
                    disabled={!isReady}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-700 hover:bg-purple-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <MousePointer2 className="w-4 h-4" />
                    Simulation Mode
                  </button>
                </div>
              </div>
            </div>
          )}

          {(isTracking || isSimulating) && (
            <button
              onClick={isTracking ? stopTracking : stopSimulation}
              className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-red-900/80 hover:bg-red-800 rounded-lg transition-colors"
            >
              <Square className="w-4 h-4" />
              {isTracking ? "Stop Camera" : "Stop Simulation"}
            </button>
          )}

          {isSimulating && (
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 rounded-lg p-4">
              <p className="text-xs text-cyan-400 mb-3">🎮 Simulation Controls</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400">Pitch (X): {simX.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={simX}
                    onChange={(e) => setSimX(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Filter (Y): {simY.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={simY}
                    onChange={(e) => setSimY(parseFloat(e.target.value))}
                    className="w-full accent-purple-400"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSimPinch(!simPinch)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      simPinch 
                        ? "bg-green-600 text-white" 
                        : "bg-zinc-700 text-zinc-400"
                    }`}
                  >
                    {simPinch ? "🔊 ON" : "🔇 OFF"}
                  </button>
                  <span className="text-xs text-zinc-500">Click to toggle sound</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6 mt-6">
          <div className="relative">
            <img 
              src="/camelotcircle-cuatripatipedo_attr1_subject.png" 
              alt="Camelot Wheel"
              className="w-48 h-48 rounded-full object-cover cursor-pointer border-4"
              style={{ borderColor: SCALE_COLORS[selectedScale] || '#45B7D1' }}
              onClick={() => {
                const currentIndex = CAMELOT_KEYS.indexOf(selectedScale);
                const nextIndex = (currentIndex + 1) % CAMELOT_KEYS.length;
                setSelectedScale(CAMELOT_KEYS[nextIndex]);
              }}
            />
            <div 
              className="absolute inset-0 flex items-center justify-center rounded-full"
              style={{ backgroundColor: `${SCALE_COLORS[selectedScale] || '#45B7D1'}22` }}
            >
              <span 
                className="text-4xl font-bold"
                style={{ color: SCALE_COLORS[selectedScale] || '#45B7D1' }}
              >
                {selectedScale}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => {
              const newValue = !isLeftHandNotes;
              console.log("[App] Hand swap clicked, was:", isLeftHandNotes, "now:", newValue);
              setIsLeftHandNotes(newValue);
              trackerRef.current?.setHandMode(newValue);
            }}
            className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
              isLeftHandNotes 
                ? "bg-cyan-700 text-white" 
                : "bg-zinc-700 text-zinc-300"
            }`}
          >
            <ArrowLeftRight className="w-5 h-5" />
            <span className="text-xs">
              {isLeftHandNotes ? "L=Notes" : "R=Notes"}
            </span>
          </button>

          <button
            onClick={handleTestSound}
            disabled={!isReady}
            className="flex items-center gap-3 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <Volume2 className="w-5 h-5" />
            Test Sound
          </button>

          <button
            onClick={toggleListening}
            disabled={!isReady}
            className={`flex items-center gap-3 px-6 py-3 rounded-lg transition-colors disabled:opacity-50 ${
              isListening 
                ? "bg-green-700 hover:bg-green-600 border border-green-600" 
                : "bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
            }`}
          >
            {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            {isListening ? "Listening..." : "Auto Key"}
          </button>

          <button
            onClick={toggleBPM}
            disabled={!isReady}
            className={`flex items-center gap-3 px-6 py-3 rounded-lg transition-colors disabled:opacity-50 ${
              isBPMTracking 
                ? "bg-purple-700 hover:bg-purple-600 border border-purple-600" 
                : "bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
            }`}
          >
            <Activity className="w-5 h-5" />
            {isBPMTracking ? `${currentBPM} BPM` : "BPM Detect"}
          </button>

          {isBPMTracking && currentBPM > 0 && (
            <div className="bg-purple-900/50 border-2 border-purple-500 rounded-xl px-4 py-2">
              <div className="text-purple-400 font-bold text-lg text-center">
                {currentBPM} BPM
              </div>
              <div className="text-purple-300 text-xs text-center">
                {(bpmConfidence * 100).toFixed(0)}% confidence
              </div>
              <div className="mt-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all duration-50"
                  style={{ width: `${(1 - beatPhase) * 100}%` }}
                />
              </div>
            </div>
          )}

          {isListening && isBPMTracking && (
            <button
              onClick={() => {
                beatSyncEnabledRef.current = !beatSyncEnabledRef.current;
                setBeatSyncEnabled(beatSyncEnabledRef.current);
              }}
              className={`text-xs px-2 py-1 rounded ${beatSyncEnabled ? 'bg-purple-600' : 'bg-zinc-700'}`}
            >
              {beatSyncEnabled ? 'Beat Sync: ON' : 'Beat Sync: OFF'}
            </button>
          )}

          {pendingKey && (
            <div className="bg-yellow-600/50 border border-yellow-500 rounded-lg px-3 py-1 text-xs">
              → {pendingKey} on beat
            </div>
          )}

          {isListening && !detectedKey && (
            <div className="bg-yellow-900/30 border-2 border-yellow-600 rounded-xl px-6 py-3 min-w-[200px]">
              <div className="text-yellow-400 font-bold text-lg text-center animate-pulse">
                Analyzing...
              </div>
              <div className="text-yellow-300 text-sm text-center mt-1">
                Play some notes!
              </div>
            </div>
          )}

          {detectedKey && (
            <div className="bg-green-900/50 border-2 border-green-500 rounded-xl px-6 py-3 min-w-[240px]">
              <div className="text-green-400 font-bold text-2xl text-center">{selectedScale}</div>
              <div className="text-green-300 text-sm text-center mt-2">
                Notes: {detectedNotes.slice(-10).join(', ') || detectedNote}
              </div>
              <div className="text-zinc-400 text-xs text-center mt-2">
                Dominant: {detectedNote} → {detectedKey}
              </div>
              <div className="text-cyan-400 text-xs text-center mt-1 font-bold">
                Confidence: {Math.min(detectionScore * 10, 100)}%
              </div>
            </div>
          )}

          {currentNote && (
            <div 
              className="rounded-lg px-4 py-2"
              style={{ 
                backgroundColor: `${SCALE_COLORS[selectedScale] || '#45B7D1'}33`,
                borderColor: SCALE_COLORS[selectedScale] || '#45B7D1'
              }}
            >
              <span 
                className="font-mono font-bold"
                style={{ color: SCALE_COLORS[selectedScale] || '#45B7D1' }}
              >
                Note: {currentNote}
              </span>
              {playMode !== 'normal' && (
                <span 
                  className="ml-2 text-xs font-bold"
                  style={{ color: playMode === 'legato' ? '#00FF00' : '#FF6600' }}
                >
                  {playMode === 'legato' ? 'LEGATO' : 'ARP'}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6 w-[640px]">
          <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Hand className={`w-4 h-4 ${isLeftHandNotes ? 'text-green-400' : 'text-red-400'}`} />
              <span className="text-sm font-medium">Left Hand</span>
              <span className="text-xs text-cyan-400">
                ({isLeftHandNotes ? "Notes" : "Filter"})
              </span>
            </div>
            <div className="space-y-1 text-xs text-zinc-400 font-mono">
              <p>X: {gestureState.leftHand?.x.toFixed(2) ?? "—"}</p>
              <p>Y: {gestureState.leftHand?.y.toFixed(2) ?? "—"}</p>
              <p>Pinch: {gestureState.leftHand?.isPinching ? "ON" : "OFF"}</p>
              {!isLeftHandNotes && <p>Filter: {(currentFilter * 100).toFixed(0)}%</p>}
              <p>→ {isLeftHandNotes ? "Notes (X=pitch, Y=legato/arp)" : "Filter (Y=cutoff)"}</p>
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Hand className={`w-4 h-4 ${isLeftHandNotes ? 'text-red-400' : 'text-green-400'}`} />
              <span className="text-sm font-medium">Right Hand</span>
              <span className="text-xs text-cyan-400">
                ({isLeftHandNotes ? "Filter" : "Notes"})
              </span>
            </div>
            <div className="space-y-1 text-xs text-zinc-400 font-mono">
              <p>X: {gestureState.rightHand?.x.toFixed(2) ?? "—"}</p>
              <p>Y: {gestureState.rightHand?.y.toFixed(2) ?? "—"}</p>
              <p>Pinch: {gestureState.rightHand?.isPinching ? "ON" : "OFF"}</p>
              {isLeftHandNotes && <p>Filter: {(currentFilter * 100).toFixed(0)}%</p>}
              <p>→ {isLeftHandNotes ? "Filter (Y=cutoff)" : "Notes (X=pitch, Y=legato/arp)"}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-zinc-500 text-xs">
          <p>🎵 Notes: X=pitch, Y↑=ARP, Y↓=legato | 🎚️ Filter: Y=cutoff | ✋ Pinch to play</p>
        </div>
      </main>
    </div>
  );
}

export default App;
