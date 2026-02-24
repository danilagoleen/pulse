import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "./components/Header";
import { UnifiedWheel } from "./components/UnifiedWheel";
import { SynthEngine } from "./audio/SynthEngine";
import { Arpeggiator, ArpPattern } from "./audio/Arpeggiator";
import { SmartAudioEngine } from "./audio/SmartAudioEngine";
import { KeyDetector } from "./audio/KeyDetector";
import { HandTracker, GestureState } from "./vision/HandTracker";
import { quantizeToScale, CAMELOT_WHEEL, SCALE_COLORS, midiToNoteName, predictNextKey, refineToMinimal, SCALES_DB } from "./music/theory";
import { Camera, Square, MousePointer2 } from "lucide-react";

function App() {
  const [isReady, setIsReady] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [_isListening, setIsListening] = useState(false);
  const [isSmartAudioActive, setIsSmartAudioActive] = useState(false);
  const [_isBPMTracking, setIsBPMTracking] = useState(false);
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
  const [currentScaleName, setCurrentScaleName] = useState('Ionian (Major)');
  const [currentNote, setCurrentNote] = useState<number | null>(null);
  const [currentNoteName, setCurrentNoteName] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<number>(0.5);
  const [isLeftHandNotes, setIsLeftHandNotes] = useState(true);
  const [playMode, setPlayMode] = useState<'legato' | 'arpeggio' | 'normal'>('normal');
  const [arpPattern, setArpPattern] = useState<ArpPattern>('up');
  const [beatQuantization, setBeatQuantization] = useState<'off' | 'quarter' | 'eighth' | 'sixteenth'>('off');
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [beatSyncEnabled] = useState(true);
  const [predictedKey, setPredictedKey] = useState<string | null>(null);

  void detectedNote; void detectionScore; void bpmConfidence; void gestureState;
  void currentNote; void currentNoteName; void currentFilter; void playMode;
  void pendingKey; void beatQuantization; void beatSyncEnabled;
  void setArpPattern; void setBeatQuantization;
  
  const [simY, setSimY] = useState(0.5);
  const [simX, setSimX] = useState(0.5);
  const [simPinch, setSimPinch] = useState(false);

  const synthRef = useRef<SynthEngine | null>(null);
  const arpRef = useRef<Arpeggiator | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const keyDetectorRef = useRef<KeyDetector | null>(null);
  const smartAudioRef = useRef<SmartAudioEngine | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const simIntervalRef = useRef<number | null>(null);
  const isLeftHandNotesRef = useRef(true);
  const beatPhaseRef = useRef(0);
  const isBPMTrackingRef = useRef(false);
  const pendingKeyRef = useRef<string | null>(null);
  const playModeRef = useRef<'legato' | 'arpeggio' | 'normal'>('normal');
  const beatQuantizationRef = useRef<'off' | 'quarter' | 'eighth' | 'sixteenth'>('off');

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
        synthRef.current?.setFilterCutoff(filterY);
        arpRef.current?.setFilterCutoff(filterY);
        console.log(`[Gesture] Filter hand Y: ${filterY.toFixed(2)} → cutoff`);
      }
      
      // Notes hand: X = pitch (left=low, right=high), Y = legato/arpeggio
      if (notesHand?.isPinching) {
        const normalizedX = notesHand.x;
        const normalizedY = notesHand.y;
        
        const scaleNotes = CAMELOT_WHEEL[selectedScale] || CAMELOT_WHEEL['8B'];
        const midiNote = quantizeToScale(normalizedX, selectedScale);
        
        console.log(`[Gesture] Scale: ${selectedScale}, notes: [${scaleNotes.join(',')}], X=${normalizedX.toFixed(2)}→M${midiNote}`);
        
        const isArpeggioMode = normalizedY > 0.6;
        const isLegatoMode = normalizedY < 0.4;
        const isMidRange = !isArpeggioMode && !isLegatoMode;
        
        const newMode: 'legato' | 'arpeggio' | 'normal' = isLegatoMode ? 'legato' : isArpeggioMode ? 'arpeggio' : 'normal';
        if (playModeRef.current !== newMode) {
          playModeRef.current = newMode;
          setPlayMode(newMode);
        }
        
        let shouldPlay = false;
        const quant = beatQuantizationRef.current;
        
        const checkBeatQuant = (): boolean => {
          if (quant === 'off' || !isBPMTrackingRef.current) return true;
          
          const beatPhase = beatPhaseRef.current;
          const threshold = quant === 'sixteenth' ? 0.125 : quant === 'eighth' ? 0.25 : 0.5;
          
          const onBeat = beatPhase < threshold || (beatPhase > 0.5 && beatPhase < 0.5 + threshold);
          return onBeat;
        };
        
        if (isLegatoMode) {
          shouldPlay = checkBeatQuant();
        } else if (isMidRange) {
          shouldPlay = checkBeatQuant();
        } else if (isArpeggioMode && isBPMTrackingRef.current) {
          const beatPhase = beatPhaseRef.current;
          const eighthNote = 0.25;
          
          const onEighth = beatPhase < eighthNote || (beatPhase > 0.5 && beatPhase < 0.5 + eighthNote);
          
          shouldPlay = onEighth;
        } else {
          shouldPlay = true;
        }
        
        console.log(`[Gesture] Pitch: X=${normalizedX.toFixed(2)}→M${midiNote}, Y=${normalizedY.toFixed(2)} mode=${isLegatoMode ? 'LEGATO' : isArpeggioMode ? 'ARP' : 'MID'} quant=${quant} play=${shouldPlay}`);
        
        if (shouldPlay) {
          setCurrentNote(midiNote);
          setCurrentNoteName(midiToNoteName(midiNote));
          
          if (isArpeggioMode && arpRef.current && arpRef.current.isReady()) {
            arpRef.current.setNotes(scaleNotes);
            arpRef.current.setBaseNote(midiNote);
            arpRef.current.setPattern(arpPattern);
            arpRef.current.setBpm(currentBPM || 120);
            arpRef.current.start();
            synthRef.current?.stop();
          } else if (isLegatoMode || isMidRange) {
            arpRef.current?.stop();
            synthRef.current?.start();
            synthRef.current?.setFrequencyFromMidi(midiNote);
            synthRef.current?.setVolume(0.5);
          }
        }
      } else {
        synthRef.current?.stop();
        arpRef.current?.stop();
        setCurrentNote(null);
        setCurrentNoteName(null);
      }
    }
  }, [selectedScale, isLeftHandNotes, arpPattern, currentBPM]);

  useEffect(() => {
    isLeftHandNotesRef.current = isLeftHandNotes;
    trackerRef.current?.setHandMode(isLeftHandNotes);
  }, [isLeftHandNotes]);

  useEffect(() => {
    beatQuantizationRef.current = beatQuantization;
  }, [beatQuantization]);

  useEffect(() => {
    synthRef.current = new SynthEngine();
    arpRef.current = new Arpeggiator();
    trackerRef.current = new HandTracker();
    trackerRef.current.setHandMode(isLeftHandNotes);
    keyDetectorRef.current = new KeyDetector();
    smartAudioRef.current = new SmartAudioEngine();
    setIsReady(true);

    return () => {
      trackerRef.current?.dispose();
      keyDetectorRef.current?.stop();
      smartAudioRef.current?.stop();
      synthRef.current?.dispose();
      arpRef.current?.dispose();
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isSmartAudioActive && selectedScale) {
      const scaleNotes = CAMELOT_WHEEL[selectedScale];
      if (scaleNotes && scaleNotes.length > 0) {
        const rootNote = scaleNotes[Math.floor(scaleNotes.length / 2)];
        synthRef.current?.start();
        synthRef.current?.setFrequencyFromMidi(rootNote);
        synthRef.current?.setVolume(0.3);
        setTimeout(() => synthRef.current?.stop(), 200);
      }
    }
  }, [selectedScale, isSmartAudioActive]);

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
        setCurrentNoteName(midiToNoteName(midiNote));
        synthRef.current.setVolume(0.5);
      } else {
        synthRef.current.stop();
        setCurrentNote(null);
        setCurrentNoteName(null);
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

  const handleTestSound = async () => {
    synthRef.current?.triggerNote(440);
    if (arpRef.current && !arpRef.current.isReady()) {
      await arpRef.current.initialize();
    }
  };

  const toggleSmartAudio = async () => {
    if (isSmartAudioActive) {
      smartAudioRef.current?.stop();
      setIsSmartAudioActive(false);
      setIsListening(false);
      setIsBPMTracking(false);
      setCurrentBPM(0);
      setBeatPhase(0);
      setBpmConfidence(0);
      setDetectedKey(null);
      setDetectedNote(null);
      setDetectedNotes([]);
    } else {
      setDetectedNote(null);
      setDetectedKey(null);
      setDetectedNotes([]);
      setDetectionScore(0);
      pendingKeyRef.current = null;
      
      await smartAudioRef.current?.start({
        onBPM: (bpm, beat, confidence) => {
          beatPhaseRef.current = beat;
          setCurrentBPM(bpm);
          setBeatPhase(beat);
          setBpmConfidence(confidence);
          setIsBPMTracking(true);
          
          if (beat < 0.1 && pendingKeyRef.current) {
            const key = pendingKeyRef.current;
            console.log("[SmartAudio] On downbeat - switching to:", key);
            setSelectedScale(key);
            setPendingKey(null);
            pendingKeyRef.current = null;
          }
        },
        onKey: (note, key, allNotes, score) => {
          console.log("[SmartAudio] Key detected:", note, "->", key, "score:", score);
          setDetectedNote(note);
          setDetectedKey(key);
          setDetectedNotes(allNotes);
          setDetectionScore(score);
          setIsListening(true);
          
          // Refine scale toward minimal (fewer notes = pentatonic, blues, etc.)
          const semitones = allNotes.map(n => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].indexOf(n)).filter(i => i >= 0);
          if (semitones.length > 0) {
            const refined = refineToMinimal(semitones);
            setCurrentScaleName(refined.name);
            console.log("[SmartAudio] Scale refined to:", refined.name, "(intervals:", refined.intervals, ")");
          }
          
          const predicted = predictNextKey(key);
          setPredictedKey(predicted);
          
          // Always switch scale immediately for now
          setSelectedScale(key);
          
          // Also queue for beat sync if BPM is tracking
          if (isBPMTrackingRef.current) {
            pendingKeyRef.current = key;
            setPendingKey(key);
          }
        }
      });
      setIsSmartAudioActive(true);
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

        <div className="flex items-center gap-8 mt-6">
          <UnifiedWheel
            currentCamelot={selectedScale}
            predictedKey={predictedKey}
            onCamelotChange={(key) => setSelectedScale(key)}
            size={300}
            bpm={isSmartAudioActive ? currentBPM : 0}
            beatPhase={beatPhase}
            isBeatActive={beatPhase < 0.15}
          />
          
          {/* Calibration Panel - Play Scale Notes Manually */}
          <div className="flex flex-col gap-2">
            <div className="text-xs text-zinc-400 text-center">🎵 Calibration - Click to play scale notes</div>
            <div className="flex gap-1 flex-wrap max-w-[280px] justify-center">
              {CAMELOT_WHEEL[selectedScale]?.slice(0, 7).map((midiNote) => (
                <button
                  key={midiNote}
                  onClick={() => {
                    synthRef.current?.start();
                    synthRef.current?.setFrequencyFromMidi(midiNote);
                    synthRef.current?.setVolume(0.5);
                    setTimeout(() => synthRef.current?.stop(), 500);
                  }}
                  className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
                  style={{ borderColor: SCALE_COLORS[selectedScale] }}
                >
                  {midiToNoteName(midiNote)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <button
                onClick={handleTestSound}
                disabled={!isReady}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                🔊 Test
              </button>
              
              <button
                onClick={toggleSmartAudio}
                disabled={!isReady}
                className={`px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 ${
                  isSmartAudioActive 
                    ? "bg-red-600 hover:bg-red-500" 
                    : "bg-green-600 hover:bg-green-500"
                }`}
              >
                {isSmartAudioActive ? "⏹ Stop" : "▶ Smart Audio"}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Руки:</span>
              <button
                onClick={() => setIsLeftHandNotes(!isLeftHandNotes)}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  isLeftHandNotes 
                    ? "bg-cyan-700 text-white" 
                    : "bg-purple-700 text-white"
                }`}
              >
                {isLeftHandNotes ? "Лев=Ноты" : "Прав=Ноты"}
              </button>
            </div>

            {isSmartAudioActive && (
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ 
                    backgroundColor: beatPhase < 0.1 ? '#ff0000' : '#666',
                    boxShadow: beatPhase < 0.1 ? '0 0 20px #ff0000' : 'none',
                    transition: 'all 0.1s'
                  }}
                />
                <span className="text-xl font-bold">{currentBPM || '--'} BPM</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-lg font-bold" style={{ color: SCALE_COLORS[selectedScale] }}>
                {selectedScale}
              </span>
              {detectedKey && (
                <span className="text-zinc-400 text-sm">
                  ({detectedKey})
                </span>
              )}
            </div>
            
            {currentScaleName && (
              <div className="text-xs text-cyan-400">
                Scale: {currentScaleName}
              </div>
            )}

            <div className="text-xs text-zinc-400 max-w-[200px]">
              {detectedNotes.length > 0 
                ? `Notes: ${detectedNotes.slice(-7).join(', ')}`
                : 'Play notes to detect key'}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-zinc-500 text-xs">
          <p>🎵 Notes: X=pitch, Y↑=legato, Y↓=ARP | 🎚️ Filter: Y=cutoff | ✋ Pinch to play</p>
        </div>
      </main>
    </div>
  );
}

export default App;
