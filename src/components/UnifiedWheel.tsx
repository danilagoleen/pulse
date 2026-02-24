import { Stage, Layer, Circle, Line, Text, Arc, Group, Ring } from 'react-konva';
import { SCALE_COLORS, CAMELOT_KEYS, CAMELOT_TO_KEY, predictNextKey, getScalePolygon } from '../music/theory';

interface UnifiedWheelProps {
  currentCamelot: string;
  predictedKey?: string | null;
  onCamelotChange?: (key: string) => void;
  size?: number;
  bpm?: number;
  beatPhase?: number;
  isBeatActive?: boolean;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const ITTEN_COLORS = [
  '#FF6B6B', '#FF8E72', '#FFB347', '#FFE066',
  '#C5E065', '#7BE495', '#4ECDC4', '#45B7D1',
  '#5C7CFA', '#845EF7', '#CC5DE8', '#FF6B9D',
];

export const UnifiedWheel: React.FC<UnifiedWheelProps> = ({
  currentCamelot,
  predictedKey,
  onCamelotChange,
  size = 320,
  bpm = 0,
  beatPhase = 0,
}) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size * 0.46;
  const middleRadius = size * 0.36;
  const polygonRadius = size * 0.25;
  const segmentAngle = 360 / 12;

  const currentColor = SCALE_COLORS[currentCamelot] || '#45B7D1';
  const scalePolygon = getScalePolygon(currentCamelot);
  
  const predicted = predictedKey || predictNextKey(currentCamelot);
  const currentIsMinor = currentCamelot.endsWith('A');

  const polygonVertices = scalePolygon.vertices.map((semitone, idx) => {
    const angle = ((semitone * 30) - 90) * (Math.PI / 180);
    return {
      x: centerX + polygonRadius * Math.cos(angle),
      y: centerY + polygonRadius * Math.sin(angle),
      note: NOTE_NAMES[semitone],
      color: scalePolygon.colors[idx % scalePolygon.colors.length],
      semitone: semitone,
    };
  });

  const polygonPoints = polygonVertices.flatMap(v => [v.x, v.y]);

  const handleSegmentClick = (key: string) => {
    if (onCamelotChange) {
      onCamelotChange(key);
    }
  };

  const beatDistance = Math.min(beatPhase, 1 - beatPhase);
  const pulseStrength = bpm > 0 ? Math.max(0, 1 - beatDistance / 0.18) : 0;
  const isDownbeat = pulseStrength > 0.75;
  const pulseRadius = outerRadius + pulseStrength * 16;

  return (
    <Stage width={size} height={size}>
      <Layer>
        <Circle
          x={centerX}
          y={centerY}
          radius={pulseRadius + 10 + pulseStrength * 4}
          fill="#0a0a0a"
          stroke={isDownbeat ? '#ff4444' : '#333'}
          strokeWidth={2 + pulseStrength * 3}
          opacity={0.45 + pulseStrength * 0.35}
          shadowColor={isDownbeat ? '#ff4444' : 'transparent'}
          shadowBlur={pulseStrength * 34}
        />

        {CAMELOT_KEYS.map((key, i) => {
          const angle = i * segmentAngle;
          const isActive = key === currentCamelot;
          const isPredicted = key === predicted;
          const color = SCALE_COLORS[key] || ITTEN_COLORS[i];
          
          return (
            <Group key={key} onClick={() => handleSegmentClick(key)} onTap={() => handleSegmentClick(key)}>
              <Arc
                x={centerX}
                y={centerY}
                innerRadius={outerRadius - 28}
                outerRadius={outerRadius}
                angle={segmentAngle - 3}
                rotation={angle - 90}
                fill={color}
                opacity={isActive ? 1 : isPredicted ? 0.6 : 0.35}
                shadowColor={isActive ? color : 'transparent'}
                shadowBlur={isActive ? 20 : isPredicted ? 10 : 0}
                shadowOpacity={0.9}
              />
              <Text
                x={centerX + (outerRadius - 18) * Math.cos((angle + segmentAngle / 2 - 90) * Math.PI / 180) - 10}
                y={centerY + (outerRadius - 18) * Math.sin((angle + segmentAngle / 2 - 90) * Math.PI / 180) - 7}
                text={key}
                fontSize={11}
                fill={isActive ? '#fff' : isPredicted ? '#aaa' : '#666'}
                fontStyle="bold"
              />
            </Group>
          );
        })}

        <Ring
          x={centerX}
          y={centerY}
          innerRadius={middleRadius - 2}
          outerRadius={middleRadius + 2}
          fill={currentColor}
          opacity={0.4}
        />

        {Array.from({ length: 12 }).map((_, i) => {
          const angle = i * segmentAngle;
          const minorKey = `${i + 1}A`;
          const majorKey = `${i + 1}B`;
          const modeKey = currentIsMinor ? minorKey : majorKey;
          const modeLabel = CAMELOT_TO_KEY[modeKey] || '';
          const pairLabel = currentIsMinor ? 'A' : 'B';
          return (
            <Group key={`inner-${i}`}>
              <Text
                x={centerX + (middleRadius - 20) * Math.cos((angle + segmentAngle / 2 - 90) * Math.PI / 180) - 7}
                y={centerY + (middleRadius - 20) * Math.sin((angle + segmentAngle / 2 - 90) * Math.PI / 180) - 7}
                text={modeLabel}
                fontSize={12}
                fill="#e2e2e2"
                fontStyle="bold"
                opacity={0.9}
              />
              <Text
                x={centerX + (middleRadius - 38) * Math.cos((angle + segmentAngle / 2 - 90) * Math.PI / 180) - 4}
                y={centerY + (middleRadius - 38) * Math.sin((angle + segmentAngle / 2 - 90) * Math.PI / 180) - 5}
                text={pairLabel}
                fontSize={9}
                fill="#8f8f8f"
                opacity={0.85}
              />
            </Group>
          );
        })}

        <Circle
          x={centerX}
          y={centerY}
          radius={middleRadius}
          stroke={isPredicted(predicted) ? SCALE_COLORS[predicted] : currentColor}
          strokeWidth={2}
          opacity={0.6}
          dash={[6, 4]}
        />

        {polygonVertices.length > 2 && (
          <>
            <Line
              points={[...polygonPoints, polygonPoints[0], polygonPoints[1]]}
              fill={currentColor}
              opacity={0.2}
              closed
            />
            <Line
              points={[...polygonPoints, polygonPoints[0], polygonPoints[1]]}
              stroke={currentColor}
              strokeWidth={3}
              closed
              opacity={0.9}
            />
            
            {polygonVertices.map((v, i) => (
              <Group key={i}>
                <Circle
                  x={v.x}
                  y={v.y}
                  radius={10}
                  fill={v.color}
                  stroke="#fff"
                  strokeWidth={1.5}
                  shadowColor={v.color}
                  shadowBlur={12}
                  shadowOpacity={0.9}
                />
                <Text
                  x={v.x - 6}
                  y={v.y - 6}
                  text={v.note}
                  fontSize={11}
                  fill="#fff"
                  fontStyle="bold"
                />
              </Group>
            ))}
          </>
        )}

        <Circle
          x={centerX}
          y={centerY}
          radius={size * 0.13}
          fill={isDownbeat ? '#1a1a1a' : '#0d0d0d'}
          stroke={currentColor}
          strokeWidth={3 + pulseStrength * 1.8}
          shadowColor={isDownbeat ? '#ff4444' : currentColor}
          shadowBlur={15 + pulseStrength * 14}
          shadowOpacity={0.7 + pulseStrength * 0.3}
        />
        
        <Text
          x={centerX - 28}
          y={centerY - 22}
          text={bpm > 0 ? `${bpm}` : '---'}
          fontSize={28}
          fontStyle="bold"
          fill={isDownbeat ? '#fff' : '#ccc'}
        />
        <Text
          x={centerX - 22}
          y={centerY + 8}
          text={bpm > 0 ? 'BPM' : 'WAIT'}
          fontSize={11}
          fill="#666"
        />
        <Text
          x={centerX - 40}
          y={centerY + 50}
          text={scalePolygon.name.split(' ')[0]}
          fontSize={10}
          fill={currentColor}
          opacity={0.8}
        />

        {predicted && predicted !== currentCamelot && (
          <>
            <Text
              x={centerX - 35}
              y={centerY + 32}
              text={`→ ${predicted}`}
              fontSize={14}
              fontStyle="bold"
              fill={SCALE_COLORS[predicted] || '#888'}
              opacity={0.8}
            />
            <Circle
              x={centerX + 30}
              y={centerY + 38}
              radius={4}
              fill={SCALE_COLORS[predicted] || '#888'}
              opacity={0.7}
            />
          </>
        )}
      </Layer>
    </Stage>
  );
};

function isPredicted(key: string | null | undefined): boolean {
  return !!key;
}

export default UnifiedWheel;
