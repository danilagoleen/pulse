import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "./components/Header";
import { UnifiedWheel } from "./components/UnifiedWheel";
import { invoke } from "@tauri-apps/api/core";
import { SynthEngine } from "./audio/SynthEngine";
import { Arpeggiator } from "./audio/Arpeggiator";
import { ExternalMidiLayer, MidiOutputInfo } from "./audio/ExternalMidiLayer";
import { SmartAudioEngine } from "./audio/SmartAudioEngine";
import { KeyDetector } from "./audio/KeyDetector";
import { HandTracker, GestureState } from "./vision/HandTracker";
import { quantizeToScale, CAMELOT_WHEEL, SCALE_COLORS, midiToNoteName, predictNextKey, refineToMinimal, CAMELOT_TO_SCALE, CAMELOT_TO_KEY } from "./music/theory";
import { detectGenre } from "./music/GenreDetector";
import { scaleLearner } from "./music/ScaleLearner";
import { Camera, Square, MousePointer2 } from "lucide-react";

const parseCamelot = (key: string): { num: number; mode: 'A' | 'B' } | null => {
  const match = key.match(/^(\d{1,2})(A|B)$/);
  if (!match) return null;
  const num = Number.parseInt(match[1], 10);
  if (num < 1 || num > 12) return null;
  return { num, mode: match[2] as 'A' | 'B' };
};

const normalizeCamelotKey = (raw: string): string | null => {
  const match = raw.match(/(\d{1,2}[AB])/i);
  if (!match) return null;
  const normalized = match[1].toUpperCase();
  return parseCamelot(normalized) ? normalized : null;
};

const getScaleFamily = (scaleName: string): 'major' | 'minor' | 'other' => {
  const n = scaleName.toLowerCase();
  if (n.includes('major') || n.includes('ionian') || n.includes('lydian') || n.includes('mixolydian')) {
    return 'major';
  }
  if (n.includes('minor') || n.includes('aeolian') || n.includes('dorian') || n.includes('phrygian') || n.includes('locrian')) {
    return 'minor';
  }
  return 'other';
};

const isBroadUnstableScale = (scaleName: string): boolean => {
  const n = scaleName.toLowerCase();
  return n.includes('chromatic') || n.includes('whole tone') || n.includes('diminished');
};

const isExoticScale = (scaleName: string): boolean => {
  const n = scaleName.toLowerCase();
  const common = ['ionian', 'major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'minor', 'locrian'];
  return !common.some((name) => n.includes(name));
};

const isScaleCompatibleWithKey = (scaleName: string, camelotKey: string): boolean => {
  const keyFamily = camelotKey.endsWith('B') ? 'major' : 'minor';
  const scaleFamily = getScaleFamily(scaleName);
  if (scaleFamily === 'other') return true;
  return keyFamily === scaleFamily;
};

const NOTE_SEMITONE: Record<string, number> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
};

const hasMinorThirdEvidence = (notes: string[], camelotKey: string): boolean => {
  const rootName = CAMELOT_TO_KEY[camelotKey];
  if (!rootName || NOTE_SEMITONE[rootName] === undefined) return false;
  const root = NOTE_SEMITONE[rootName];
  const minorThird = (root + 3) % 12;
  const majorThird = (root + 4) % 12;
  const noteSemitones = new Set(notes.map((n) => NOTE_SEMITONE[n]).filter((n) => n !== undefined));
  return noteSemitones.has(minorThird) && !noteSemitones.has(majorThird);
};

const mapGenreToInternalPresetIndex = (genre: string): number => {
  const g = genre.toLowerCase();
  if (g.includes('ambient') || g.includes('drone')) return 2; // Korg Pad
  if (g.includes('techno') || g.includes('dnb') || g.includes('hardcore')) return 3; // Berlin Sequence
  if (g.includes('metal') || g.includes('rock')) return 1; // Moog Bass
  if (g.includes('jazz') || g.includes('fusion')) return 4; // Digital FM-ish
  if (g.includes('avant') || g.includes('experimental')) return 5; // Dark Drone
  return 0; // Theremin Classic
};

function App() {
  interface SynthPluginStatus {
    surge_vst3: boolean;
    surge_fx_vst3: boolean;
    surge_app: boolean;
    plugin_dir: string;
    found_paths: string[];
    message: string;
  }
  interface VstRackInfo {
    plugins: string[];
    active_index: number | null;
    active_name: string | null;
  }

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
  const [selectedCamelotKey, setSelectedCamelotKey] = useState('8B');
  const [selectedScaleName, setSelectedScaleName] = useState('Ionian (Major)');
  const [currentNote, setCurrentNote] = useState<number | null>(null);
  const [currentNoteName, setCurrentNoteName] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<number>(0.5);
  const [isLeftHandNotes, setIsLeftHandNotes] = useState(true);
  const [playMode, setPlayMode] = useState<'legato' | 'arpeggio' | 'normal'>('normal');
  const [beatQuantization] = useState<'off' | 'quarter' | 'eighth' | 'sixteenth'>('off');
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [beatSyncEnabled] = useState(true);
  const [predictedKey, setPredictedKey] = useState<string | null>(null);
  const [detectedGenre, setDetectedGenre] = useState<string | null>(null);
  const [suggestedVST, setSuggestedVST] = useState<string[]>([]);
  const [synthStatus, setSynthStatus] = useState<SynthPluginStatus | null>(null);
  const [synthStatusError, setSynthStatusError] = useState<string | null>(null);
  const [audioLayerMode, setAudioLayerMode] = useState<'internal' | 'external'>('internal');
  const [midiOutputs, setMidiOutputs] = useState<MidiOutputInfo[]>([]);
  const [selectedMidiOutputId, setSelectedMidiOutputId] = useState<string>('');
  const [midiLayerError, setMidiLayerError] = useState<string | null>(null);
  const [vstRack, setVstRack] = useState<VstRackInfo | null>(null);
  const [vstRackError, setVstRackError] = useState<string | null>(null);
  const [autoPresetEnabled, setAutoPresetEnabled] = useState(true);
  const [autoSynthEnabled, setAutoSynthEnabled] = useState(true);
  const [currentProgram, setCurrentProgram] = useState(80);
  const [internalPresetNames, setInternalPresetNames] = useState<string[]>([]);
  const [internalPresetIndex, setInternalPresetIndex] = useState(0);
  const [autoInternalPresetEnabled, setAutoInternalPresetEnabled] = useState(true);
  
  // Scale stability - only update when scale actually changes
  const lastScaleRef = useRef<string>('');

  void detectedNote; void detectionScore; void bpmConfidence; void gestureState;
  void currentNote; void currentNoteName; void currentFilter; void playMode;
  void pendingKey; void beatQuantization; void beatSyncEnabled;
  
  const [simY, setSimY] = useState(0.5);
  const [simX, setSimX] = useState(0.5);
  const [simPinch, setSimPinch] = useState(false);

  const synthRef = useRef<SynthEngine | null>(null);
  const arpRef = useRef<Arpeggiator | null>(null);
  const externalMidiRef = useRef<ExternalMidiLayer | null>(null);
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
  const currentBPMRef = useRef(120);
  const smoothedBpmRef = useRef(120);
  const pendingKeyRef = useRef<string | null>(null);
  const scaleCandidateRef = useRef<string | null>(null);
  const scaleCandidateHitsRef = useRef(0);
  const lastScaleCommitAtRef = useRef(0);
  const keyCandidateRef = useRef<string | null>(null);
  const keyCandidateHitsRef = useRef(0);
  const lastKeyCommitAtRef = useRef(0);
  const playModeRef = useRef<'legato' | 'arpeggio' | 'normal'>('normal');
  const beatQuantizationRef = useRef<'off' | 'quarter' | 'eighth' | 'sixteenth'>('off');
  const selectedCamelotRef = useRef(selectedCamelotKey);
  const selectedScaleRef = useRef(selectedScaleName);

  const canUseExternalMidi = audioLayerMode === 'external' && externalMidiRef.current?.isReady();

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
        if (!canUseExternalMidi) {
          synthRef.current?.setFilterCutoff(filterY);
        }
        console.log(`[Gesture] Filter hand Y: ${filterY.toFixed(2)} → cutoff`);
      }
      
      // Notes hand: X = pitch (left=low, right=high), Y = legato/arpeggio
      if (notesHand?.isPinching) {
        const normalizedX = notesHand.x;
        const normalizedY = notesHand.y;
        
        const scaleNotes = CAMELOT_WHEEL[selectedCamelotKey] || CAMELOT_WHEEL['8B'];
        const midiNote = quantizeToScale(normalizedX, selectedCamelotKey);
        
        console.log(`[Gesture] Scale: ${selectedCamelotKey}, notes: [${scaleNotes.join(',')}], X=${normalizedX.toFixed(2)}→M${midiNote}`);
        
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
        
        if (isArpeggioMode) {
          shouldPlay = true;
        } else if (isLegatoMode) {
          shouldPlay = checkBeatQuant();
        } else if (isMidRange) {
          shouldPlay = checkBeatQuant();
        } else {
          shouldPlay = true;
        }
        
        console.log(`[Gesture] Pitch: X=${normalizedX.toFixed(2)}→M${midiNote}, Y=${normalizedY.toFixed(2)} mode=${isLegatoMode ? 'LEGATO' : isArpeggioMode ? 'ARP' : 'MID'} quant=${quant} play=${shouldPlay}`);
        
        if (shouldPlay) {
          setCurrentNote(midiNote);
          setCurrentNoteName(midiToNoteName(midiNote));
          
          if (isArpeggioMode && arpRef.current) {
            const arpMorph = Math.min(Math.max((normalizedY - 0.6) / 0.4, 0), 1);
            // Kaoss-like pulse mode: same note, same synth, rhythmic gating by BPM.
            arpRef.current.setPulseNote(midiNote);
            arpRef.current.setBpm(currentBPM || 120);
            arpRef.current.setDiffusion(arpMorph);
            arpRef.current.setNoteCallback((arpMidi, gateMs, morph) => {
              if (canUseExternalMidi) {
                externalMidiRef.current?.trigger(arpMidi, gateMs, 104);
                return;
              }
              synthRef.current?.start();
              synthRef.current?.setMorph(0.3 + morph * 0.7);
              synthRef.current?.triggerArpFromMidi(arpMidi, 0.34, gateMs);
            });
            void arpRef.current.start();
          } else if (isLegatoMode || isMidRange) {
            arpRef.current?.setPulseNote(null);
            arpRef.current?.stop();
            if (canUseExternalMidi) {
              externalMidiRef.current?.playLegato(midiNote, isLegatoMode ? 108 : 96);
              return;
            }
            synthRef.current?.start();
            synthRef.current?.setMorph(isLegatoMode ? 0 : 0.35);
            synthRef.current?.holdNoteFromMidi(midiNote, isLegatoMode ? 0.48 : 0.38);
          }
        }
      } else {
        if (canUseExternalMidi) {
          externalMidiRef.current?.stopAll();
        } else {
          synthRef.current?.releaseNote();
        }
        arpRef.current?.setPulseNote(null);
        arpRef.current?.stop();
        setCurrentNote(null);
        setCurrentNoteName(null);
      }
    }
  }, [selectedCamelotKey, currentBPM, canUseExternalMidi]);

  useEffect(() => {
    isLeftHandNotesRef.current = isLeftHandNotes;
    trackerRef.current?.setHandMode(isLeftHandNotes);
  }, [isLeftHandNotes]);

  useEffect(() => {
    beatQuantizationRef.current = beatQuantization;
  }, [beatQuantization]);

  useEffect(() => {
    selectedCamelotRef.current = selectedCamelotKey;
  }, [selectedCamelotKey]);

  useEffect(() => {
    selectedScaleRef.current = selectedScaleName;
  }, [selectedScaleName]);

  useEffect(() => {
    if (!isSmartAudioActive || !detectedKey) return;
    const normalized = normalizeCamelotKey(detectedKey);
    if (!normalized || normalized === selectedCamelotRef.current) return;
    setSelectedCamelotKey(normalized);
  }, [detectedKey, isSmartAudioActive]);

  useEffect(() => {
    isBPMTrackingRef.current = _isBPMTracking;
  }, [_isBPMTracking]);

  useEffect(() => {
    synthRef.current = new SynthEngine();
    setInternalPresetNames(synthRef.current.getPresetNames());
    setInternalPresetIndex(synthRef.current.getCurrentPresetIndex());
    arpRef.current = new Arpeggiator();
    externalMidiRef.current = new ExternalMidiLayer();
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
      externalMidiRef.current?.stopAll();
      arpRef.current?.dispose();
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, []);

  const refreshMidiOutputs = useCallback(async () => {
    try {
      if (!externalMidiRef.current) {
        externalMidiRef.current = new ExternalMidiLayer();
      }
      const initialized = await externalMidiRef.current.initialize();
      if (!initialized) {
        setMidiLayerError("Native MIDI layer initialization failed");
        return;
      }
      const outputs = externalMidiRef.current.getOutputs();
      setMidiOutputs(outputs);
      setMidiLayerError(null);
      if (outputs.length > 0) {
        const keepCurrent = outputs.some((o) => o.id === selectedMidiOutputId);
        if (keepCurrent) {
          setSelectedMidiOutputId(selectedMidiOutputId);
          await externalMidiRef.current.setOutputById(selectedMidiOutputId);
          setCurrentProgram(externalMidiRef.current.getCurrentProgram());
        } else {
          const preferred = await externalMidiRef.current.autoConnectPreferred();
          if (preferred) {
            setSelectedMidiOutputId(preferred.id);
            setCurrentProgram(externalMidiRef.current.getCurrentProgram());
          }
        }
      } else {
        const virtual = await externalMidiRef.current.autoConnectPreferred();
        if (virtual) {
          setMidiOutputs([virtual]);
          setSelectedMidiOutputId(virtual.id);
          setCurrentProgram(externalMidiRef.current.getCurrentProgram());
        } else {
          setSelectedMidiOutputId('');
        }
      }
    } catch (error) {
      setMidiLayerError((error as Error).message || "Failed to initialize MIDI outputs");
    }
  }, [selectedMidiOutputId]);

  const refreshSynthStatus = useCallback(async () => {
    try {
      const status = await invoke<SynthPluginStatus>("get_synth_status");
      setSynthStatus(status);
      setSynthStatusError(null);
    } catch (error) {
      setSynthStatusError((error as Error).message || "Failed to load synth status");
    }
  }, []);

  const refreshVstRack = useCallback(async () => {
    try {
      const rack = await invoke<VstRackInfo>('scan_vst_rack');
      setVstRack(rack);
      setVstRackError(null);
    } catch (error) {
      setVstRackError((error as Error).message || 'Failed to scan VST rack');
    }
  }, []);

  const selectNextVst = useCallback(async () => {
    try {
      setAutoSynthEnabled(false);
      setAudioLayerMode('external');
      const rack = await invoke<VstRackInfo>('next_vst_in_rack');
      setVstRack(rack);
      setVstRackError(null);
    } catch (error) {
      setVstRackError((error as Error).message || 'Failed to switch to next VST');
    }
  }, []);

  const selectPrevVst = useCallback(async () => {
    try {
      setAutoSynthEnabled(false);
      setAudioLayerMode('external');
      const rack = await invoke<VstRackInfo>('prev_vst_in_rack');
      setVstRack(rack);
      setVstRackError(null);
    } catch (error) {
      setVstRackError((error as Error).message || 'Failed to switch to previous VST');
    }
  }, []);

  useEffect(() => {
    void refreshSynthStatus();
  }, [refreshSynthStatus]);

  useEffect(() => {
    void refreshVstRack();
  }, [refreshVstRack]);

  useEffect(() => {
    void refreshMidiOutputs();
  }, [refreshMidiOutputs]);

  useEffect(() => {
    if (!canUseExternalMidi || !detectedGenre || !autoPresetEnabled) return;
    (async () => {
      const program = await externalMidiRef.current?.applyGenrePreset(selectedScaleName, detectedGenre);
      if (typeof program === 'number') setCurrentProgram(program);
    })();
  }, [detectedGenre, selectedScaleName, canUseExternalMidi, autoPresetEnabled]);

  useEffect(() => {
    if (!autoSynthEnabled || !suggestedVST[0]) return;
    (async () => {
      try {
        const rack = await invoke<VstRackInfo>('select_vst_by_hint', { hint: suggestedVST[0] });
        setVstRack(rack);
      } catch {
        // keep current synth when hint has no match
      }
    })();
  }, [suggestedVST, autoSynthEnabled]);

  useEffect(() => {
    if (audioLayerMode !== 'internal' || !autoInternalPresetEnabled || !detectedGenre) return;
    const nextIndex = mapGenreToInternalPresetIndex(detectedGenre);
    const applied = synthRef.current?.setPresetByIndex(nextIndex);
    if (typeof applied === 'number') {
      setInternalPresetIndex(applied);
    }
  }, [audioLayerMode, autoInternalPresetEnabled, detectedGenre]);

  useEffect(() => {
    if (audioLayerMode === 'external') {
      synthRef.current?.stop();
    } else {
      externalMidiRef.current?.stopAll();
    }
  }, [audioLayerMode]);

  const ensureExternalLayerReady = useCallback(async (): Promise<boolean> => {
    setAudioLayerMode('external');
    if (!externalMidiRef.current?.isReady()) {
      await refreshMidiOutputs();
    }
    return Boolean(externalMidiRef.current?.isReady());
  }, [refreshMidiOutputs]);

  useEffect(() => {
    if (isSmartAudioActive && selectedCamelotKey && !canUseExternalMidi) {
      const scaleNotes = CAMELOT_WHEEL[selectedCamelotKey];
      if (scaleNotes && scaleNotes.length > 0) {
        const rootNote = scaleNotes[Math.floor(scaleNotes.length / 2)];
        synthRef.current?.start();
        synthRef.current?.setFrequencyFromMidi(rootNote);
        synthRef.current?.setVolume(0.3);
        setTimeout(() => synthRef.current?.stop(), 200);
      }
    }
  }, [selectedCamelotKey, isSmartAudioActive, canUseExternalMidi]);

  useEffect(() => {
    if (isSimulating && synthRef.current) {
      const noteX = isLeftHandNotes ? simX : 0.5;
      const filterY = isLeftHandNotes ? simY : 0.5;
      
      // Filter: Y axis
      if (!canUseExternalMidi) {
        synthRef.current.setFilterCutoff(filterY);
      }
      setCurrentFilter(filterY);
      
      if (simPinch) {
        // Pitch: X axis
        const midiNote = quantizeToScale(noteX, selectedCamelotKey);
        setCurrentNote(midiNote);
        setCurrentNoteName(midiToNoteName(midiNote));
        if (canUseExternalMidi) {
          externalMidiRef.current?.playLegato(midiNote, 104);
        } else {
          synthRef.current.start();
          synthRef.current.setFrequencyFromMidi(midiNote);
          synthRef.current.setVolume(0.5);
        }
      } else {
        if (canUseExternalMidi) {
          externalMidiRef.current?.stopAll();
        } else {
          synthRef.current.stop();
        }
        setCurrentNote(null);
        setCurrentNoteName(null);
      }
      
      setGestureState({
        leftHand: { x: isLeftHandNotes ? simX : 0.5, y: isLeftHandNotes ? simY : 0.5, z: 0, isPinching: false },
        rightHand: { x: isLeftHandNotes ? 0.5 : simX, y: isLeftHandNotes ? 0.5 : simY, z: 0, isPinching: simPinch },
      });
    }
  }, [isSimulating, simY, simX, simPinch, selectedCamelotKey, isLeftHandNotes, canUseExternalMidi]);

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
    if (canUseExternalMidi) {
      externalMidiRef.current?.stopAll();
    } else {
      synthRef.current?.stop();
    }
  };

  const startSimulation = () => {
    setIsSimulating(true);
    setIsTracking(false);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if (canUseExternalMidi) {
      externalMidiRef.current?.stopAll();
    } else {
      synthRef.current?.stop();
    }
    setGestureState({ leftHand: null, rightHand: null });
  };

  const handleTestSound = async () => {
    if (canUseExternalMidi) {
      externalMidiRef.current?.trigger(69, 280, 108);
    } else {
      synthRef.current?.triggerNote(440);
    }
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
      isBPMTrackingRef.current = false;
      setCurrentBPM(0);
      setBeatPhase(0);
      setBpmConfidence(0);
      setDetectedKey(null);
      setDetectedNote(null);
      setDetectedNotes([]);
      pendingKeyRef.current = null;
      setPendingKey(null);
      scaleCandidateRef.current = null;
      scaleCandidateHitsRef.current = 0;
      keyCandidateRef.current = null;
      keyCandidateHitsRef.current = 0;
    } else {
      setDetectedNote(null);
      setDetectedKey(null);
      setDetectedNotes([]);
      setDetectionScore(0);
      pendingKeyRef.current = null;
      
      await smartAudioRef.current?.start({
        onBPM: (bpm, beat, confidence) => {
          beatPhaseRef.current = beat;
          const target = Math.min(Math.max(bpm, 50), 190);
          smoothedBpmRef.current = smoothedBpmRef.current + (target - smoothedBpmRef.current) * 0.2;
          const smoothedBpm = Math.round(smoothedBpmRef.current);
          setCurrentBPM(smoothedBpm);
          currentBPMRef.current = smoothedBpm;
          setBeatPhase(beat);
          setBpmConfidence(confidence);
          setIsBPMTracking(true);
          isBPMTrackingRef.current = true;
          
          // Key commit now happens immediately in onKey to keep Active key in sync with Detected key.
        },
        onKey: (note, key, allNotes, score) => {
          const normalizedKey = normalizeCamelotKey(key) || selectedCamelotRef.current;
          console.log("[SmartAudio] Key detected:", note, "->", normalizedKey, "score:", score);
          setDetectedNote(note);
          setDetectedKey(normalizedKey);
          setDetectedNotes(allNotes);
          setDetectionScore(score);
          setIsListening(true);
          
          // Add notes to ScaleLearner history for pattern learning
          for (const n of allNotes) {
            scaleLearner.addNote(n);
          }
          scaleLearner.learnScale();
          
          // Learn scale from accumulated note history
          const currentBest = scaleLearner.getCurrentScale();
          const learnerStatus = scaleLearner.getStatus();
          
          console.log("[ScaleLearner] Status:", learnerStatus);
          
          // Use learned scale if confidence is high enough
          let refinedScaleName = selectedScaleRef.current;
          if (currentBest.scale && currentBest.confidence > 0.4) {
            refinedScaleName = currentBest.scale.name;
            if (refinedScaleName === 'Chromatic' && learnerStatus.uniqueNotes < 10) {
              // Guard against collapsing into generic chromatic too early.
              refinedScaleName = selectedScaleRef.current;
            }
            console.log("[ScaleLearner] LEARNED scale:", refinedScaleName, "confidence:", currentBest.confidence.toFixed(2));
          } else if (allNotes.length > 0) {
            // Fallback to simple refine
            const semitones = allNotes.map(n => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].indexOf(n)).filter(i => i >= 0);
            if (semitones.length > 0) {
              const refined = refineToMinimal(semitones);
              refinedScaleName = refined.name;
              if (refinedScaleName === 'Chromatic' && learnerStatus.uniqueNotes < 10) {
                refinedScaleName = selectedScaleRef.current;
              }
            }
          }

          if (isExoticScale(refinedScaleName) && learnerStatus.uniqueNotes < 6) {
            refinedScaleName = CAMELOT_TO_SCALE[selectedCamelotRef.current] || selectedScaleRef.current;
          }
          if (refinedScaleName === 'Spanish' && learnerStatus.uniqueNotes < 9) {
            refinedScaleName = CAMELOT_TO_SCALE[selectedCamelotRef.current] || selectedScaleRef.current;
          }

          const keyIsMinor = normalizedKey.endsWith('A');
          const refinedFamily = getScaleFamily(refinedScaleName);
          const minorThirdEvidence = hasMinorThirdEvidence(allNotes, normalizedKey);
          if (keyIsMinor && refinedFamily === 'major' && (minorThirdEvidence || currentBest.confidence < 0.72)) {
            refinedScaleName = 'Aeolian (Natural Minor)';
          }

          if (!keyIsMinor && refinedFamily === 'minor' && currentBest.confidence < 0.72) {
            refinedScaleName = 'Ionian (Major)';
          }
          
          const now = performance.now();
          const scoreHigh = score >= 8;

          if (refinedScaleName !== lastScaleRef.current) {
            if (scaleCandidateRef.current === refinedScaleName) {
              scaleCandidateHitsRef.current += 1;
            } else {
              scaleCandidateRef.current = refinedScaleName;
              scaleCandidateHitsRef.current = 1;
            }

            const broadScale = isBroadUnstableScale(refinedScaleName);
            const exoticScale = isExoticScale(refinedScaleName);
            const spanishScale = refinedScaleName === 'Spanish';
            const requiredScaleHits = broadScale ? 7 : spanishScale ? 8 : exoticScale ? 6 : 4;
            const requiredScaleHoldMs = broadScale ? 3400 : spanishScale ? 5200 : exoticScale ? 4200 : 2400;
            const enoughScaleEvidence = scaleCandidateHitsRef.current >= requiredScaleHits;
            const scaleHoldPassed = now - lastScaleCommitAtRef.current >= requiredScaleHoldMs;
            const keyCompatible = isScaleCompatibleWithKey(refinedScaleName, selectedCamelotRef.current);
            const strongOverride = scoreHigh && scaleCandidateHitsRef.current >= requiredScaleHits + 2 && keyCompatible;

            if ((enoughScaleEvidence && scaleHoldPassed && keyCompatible) || strongOverride) {
              console.log("[SmartAudio] Scale COMMIT:", lastScaleRef.current, "→", refinedScaleName);
              lastScaleRef.current = refinedScaleName;
              lastScaleCommitAtRef.current = now;
              scaleCandidateRef.current = null;
              scaleCandidateHitsRef.current = 0;
              setSelectedScaleName(refinedScaleName);

              const currentBPM = currentBPMRef.current || 120;
              const genreResult = detectGenre(currentBPM, refinedScaleName);
              setDetectedGenre(genreResult.genre);
              setSuggestedVST(genreResult.suggestedVST);
              console.log("[SmartAudio] Genre detected:", genreResult.genre, "→ VST:", genreResult.suggestedVST);
            }
          } else {
            scaleCandidateRef.current = null;
            scaleCandidateHitsRef.current = 0;
          }

          if (normalizedKey !== selectedCamelotRef.current) {
            const prevKey = selectedCamelotRef.current;
            setSelectedCamelotKey(normalizedKey);
            if (prevKey !== normalizedKey) {
              setSelectedScaleName((prev) => {
                const mapped = CAMELOT_TO_SCALE[normalizedKey];
                if (!mapped) return prev;
                if (!isScaleCompatibleWithKey(prev, normalizedKey) || isExoticScale(prev)) return mapped;
                return prev;
              });
            }
            lastKeyCommitAtRef.current = now;
            pendingKeyRef.current = null;
            setPendingKey(null);
            keyCandidateRef.current = null;
            keyCandidateHitsRef.current = 0;
          } else {
            pendingKeyRef.current = null;
            setPendingKey(null);
            keyCandidateRef.current = null;
            keyCandidateHitsRef.current = 0;
          }
          
          const predicted = predictNextKey(normalizedKey);
          setPredictedKey(predicted);
        }
      });
      setIsSmartAudioActive(true);
    }
  };

  const handleCamelotChange = (key: string) => {
    setSelectedCamelotKey(key);
    setSelectedScaleName(CAMELOT_TO_SCALE[key] || selectedScaleName);
  };

  const handleLaunchSurge = async () => {
    try {
      await invoke("launch_surge_xt");
      await refreshSynthStatus();
    } catch (error) {
      setSynthStatusError((error as Error).message || "Failed to launch Surge XT");
    }
  };

  const handleOpenPluginFolder = async () => {
    try {
      await invoke("open_plugin_folder");
    } catch (error) {
      setSynthStatusError((error as Error).message || "Failed to open plugin folder");
    }
  };

  const handleSelectMidiOutput = (outputId: string) => {
    setAudioLayerMode('external');
    setSelectedMidiOutputId(outputId);
    (async () => {
      await externalMidiRef.current?.setOutputById(outputId);
      setCurrentProgram(externalMidiRef.current?.getCurrentProgram() || 80);
    })();
    setMidiLayerError(null);
  };

  const shiftProgram = (delta: number) => {
    setAutoPresetEnabled(false);
    (async () => {
      const ready = await ensureExternalLayerReady();
      if (!ready) return;
      const program = await externalMidiRef.current?.shiftProgram(delta);
      if (typeof program === 'number') setCurrentProgram(program);
    })();
  };

  const shiftInternalPreset = (delta: number) => {
    setAudioLayerMode('internal');
    setAutoInternalPresetEnabled(false);
    const next = synthRef.current?.shiftPreset(delta);
    if (typeof next === 'number') {
      setInternalPresetIndex(next);
    }
  };

  return (
    <div 
      className="min-h-screen text-white transition-colors duration-300"
      style={{ 
        backgroundColor: '#000',
        borderLeft: `4px solid ${SCALE_COLORS[selectedCamelotKey] || '#45B7D1'}`
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
            currentCamelot={selectedCamelotKey}
            selectedScaleName={selectedScaleName}
            predictedKey={predictedKey}
            onCamelotChange={handleCamelotChange}
            size={300}
            bpm={isSmartAudioActive ? currentBPM : 0}
            beatPhase={beatPhase}
            isBeatActive={beatPhase < 0.15}
          />
          
          {/* Calibration Panel - Play Scale Notes Manually */}
          <div className="flex flex-col gap-2">
            <div className="text-xs text-zinc-400 text-center">🎵 Calibration - Click to play scale notes</div>
            <div className="flex gap-1 flex-wrap max-w-[280px] justify-center">
              {CAMELOT_WHEEL[selectedCamelotKey]?.slice(0, 7).map((midiNote) => (
                <button
                  key={midiNote}
                  onClick={() => {
                    if (canUseExternalMidi) {
                      externalMidiRef.current?.trigger(midiNote, 320, 108);
                    } else {
                      synthRef.current?.start();
                      synthRef.current?.setFrequencyFromMidi(midiNote);
                      synthRef.current?.setVolume(0.5);
                      setTimeout(() => synthRef.current?.stop(), 500);
                    }
                  }}
                  className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
                  style={{ borderColor: SCALE_COLORS[selectedCamelotKey] }}
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

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Active key:</span>
              <span className="text-lg font-bold" style={{ color: SCALE_COLORS[selectedCamelotKey] }}>
                {selectedCamelotKey} ({CAMELOT_TO_KEY[selectedCamelotKey] || '?'})
              </span>
            </div>
            {detectedKey && (
              <div className="text-xs text-zinc-500">
                Detected key: {detectedKey} ({CAMELOT_TO_KEY[detectedKey] || '?'})
              </div>
            )}
            
            {selectedScaleName && (
              <div className="text-xs text-cyan-400">
                Scale: {selectedScaleName}
              </div>
            )}

            {detectedGenre && (
              <div className="text-xs text-purple-400">
                Genre: {detectedGenre}
                {suggestedVST.length > 0 && (
                  <span className="text-zinc-400 ml-1">
                    → {suggestedVST[0]}
                  </span>
                )}
              </div>
            )}

            {synthStatus && (
              <div className="text-xs text-zinc-300 max-w-[260px] space-y-2">
                <div className="text-zinc-400">
                  Internal Rack: {internalPresetNames[internalPresetIndex] || 'Theremin Classic'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => shiftInternalPreset(-1)}
                    className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-[11px]"
                  >
                    Prev Sound
                  </button>
                  <button
                    onClick={() => shiftInternalPreset(1)}
                    className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-[11px]"
                  >
                    Next Sound
                  </button>
                  <button
                    onClick={() => setAutoInternalPresetEnabled((prev) => !prev)}
                    className={`px-2 py-1 rounded text-[11px] ${autoInternalPresetEnabled ? 'bg-green-700 text-white' : 'bg-zinc-700 text-zinc-300'}`}
                  >
                    {autoInternalPresetEnabled ? 'Auto' : 'Hold'}
                  </button>
                </div>

                <div className="text-zinc-400">
                  Audio Layer:
                  <button
                    onClick={() => setAudioLayerMode('internal')}
                    className={`ml-2 px-2 py-1 rounded text-[11px] ${audioLayerMode === 'internal' ? 'bg-cyan-700 text-white' : 'bg-zinc-700 text-zinc-300'}`}
                  >
                    Internal
                  </button>
                  <button
                    onClick={() => setAudioLayerMode('external')}
                    className={`ml-2 px-2 py-1 rounded text-[11px] ${audioLayerMode === 'external' ? 'bg-cyan-700 text-white' : 'bg-zinc-700 text-zinc-300'}`}
                  >
                    External MIDI
                  </button>
                </div>
                {audioLayerMode === 'external' ? (
                  <>
                    <div className="text-zinc-400">
                      VST Rack: {vstRack?.active_name || 'None'}
                      {vstRack && (
                        <span className="text-zinc-500 ml-1">
                          ({vstRack.plugins.length})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setAudioLayerMode('external');
                          void selectPrevVst();
                        }}
                        disabled={!vstRack || (vstRack.plugins.length ?? 0) < 2}
                        className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 rounded text-[11px]"
                      >
                        Prev Synth
                      </button>
                      <button
                        onClick={() => {
                          setAudioLayerMode('external');
                          void selectNextVst();
                        }}
                        disabled={!vstRack || (vstRack.plugins.length ?? 0) < 2}
                        className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 rounded text-[11px]"
                      >
                        Next Synth
                      </button>
                      <button
                        onClick={() => setAutoSynthEnabled((prev) => !prev)}
                        className={`px-2 py-1 rounded text-[11px] ${autoSynthEnabled ? 'bg-green-700 text-white' : 'bg-zinc-700 text-zinc-300'}`}
                      >
                        {autoSynthEnabled ? 'Auto' : 'Hold'}
                      </button>
                      <button
                        onClick={refreshVstRack}
                        className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-[11px]"
                      >
                        Rescan Rack
                      </button>
                    </div>

                    <div className="text-zinc-400">
                      MIDI Out:
                      <select
                        value={selectedMidiOutputId}
                        onChange={(e) => handleSelectMidiOutput(e.target.value)}
                        className="ml-2 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[11px]"
                      >
                        <option value="">No output</option>
                        {midiOutputs.map((out) => (
                          <option key={out.id} value={out.id}>
                            {out.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={refreshMidiOutputs}
                        className="ml-2 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-[11px]"
                      >
                        Rescan MIDI
                      </button>
                    </div>

                    <div className="text-zinc-400 flex items-center gap-2">
                      <span>Program: {currentProgram}</span>
                      <button
                        onClick={() => shiftProgram(-1)}
                        className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-[11px]"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => shiftProgram(1)}
                        className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-[11px]"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => setAutoPresetEnabled((prev) => !prev)}
                        className={`px-2 py-1 rounded text-[11px] ${autoPresetEnabled ? 'bg-green-700 text-white' : 'bg-zinc-700 text-zinc-300'}`}
                      >
                        {autoPresetEnabled ? 'Auto' : 'Hold'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-zinc-500 text-[11px]">
                    External rack controls hidden in Internal mode.
                  </div>
                )}

                <div className="text-zinc-400">
                  Surge XT: {synthStatus.surge_vst3 ? "VST3" : "no VST3"} / {synthStatus.surge_fx_vst3 ? "FX" : "no FX"} / {synthStatus.surge_app ? "APP" : "no APP"}
                </div>
                <div className="text-zinc-500">{synthStatus.message}</div>
                <div className="flex gap-2">
                  <button
                    onClick={refreshSynthStatus}
                    className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-[11px]"
                  >
                    Rescan VST
                  </button>
                  <button
                    onClick={handleOpenPluginFolder}
                    className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-[11px]"
                  >
                    Open VST Folder
                  </button>
                  <button
                    onClick={handleLaunchSurge}
                    disabled={!synthStatus.surge_app}
                    className="px-2 py-1 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 rounded text-[11px]"
                  >
                    Launch Surge
                  </button>
                </div>
              </div>
            )}

            {synthStatusError && (
              <div className="text-xs text-red-400 max-w-[260px]">
                {synthStatusError}
              </div>
            )}

            {midiLayerError && (
              <div className="text-xs text-red-400 max-w-[260px]">
                {midiLayerError}
              </div>
            )}

            {vstRackError && (
              <div className="text-xs text-red-400 max-w-[260px]">
                {vstRackError}
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
