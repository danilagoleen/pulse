import { Stage, Layer, Circle, Line, Text, Arc, Group, Ring } from 'react-konva';
import { SCALE_COLORS, CAMELOT_KEYS, predictNextKey, getScalePolygon } from '../music/theory';

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
  const innerRadius = size * 0.26;
  const segmentAngle = 360 / 12;

  const currentColor = SCALE_COLORS[currentCamelot] || '#45B7D1';
  const scalePolygon = getScalePolygon(currentCamelot);
  
  const predicted = predictedKey || predictNextKey(currentCamelot);

  const polygonVertices = scalePolygon.vertices.map((semitone, idx) => {
    const angle = ((semitone * 30) - 90) * (Math.PI / 180);
    return {
      x: centerX + innerRadius * Math.cos(angle),
      y: centerY + innerRadius * Math.sin(angle),
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

  const isDownbeat = beatPhase < 0.15;
  const pulseRadius = isDownbeat ? outerRadius + 15 : outerRadius;

  return (
    <Stage width={size} height={size}>
      <Layer>
        <Circle
          x={centerX}
          y={centerY}
          radius={pulseRadius + 10}
          fill="#0a0a0a"
          stroke={isDownbeat ? '#ff4444' : '#333'}
          strokeWidth={isDownbeat ? 4 : 2}
          opacity={isDownbeat ? 0.8 : 0.5}
          shadowColor={isDownbeat ? '#ff4444' : 'transparent'}
          shadowBlur={isDownbeat ? 30 : 0}
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
              opacity={0.12}
              closed
            />
            <Line
              points={[...polygonPoints, polygonPoints[0], polygonPoints[1]]}
              stroke={currentColor}
              strokeWidth={2}
              dash={[6, 3]}
              closed
              opacity={0.85}
            />
            
            {polygonVertices.map((v, i) => (
              <Group key={i}>
                <Circle
                  x={v.x}
                  y={v.y}
                  radius={12}
                  fill={v.color}
                  stroke="#fff"
                  strokeWidth={2}
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
          strokeWidth={isDownbeat ? 4 : 3}
          shadowColor={isDownbeat ? '#ff4444' : currentColor}
          shadowBlur={isDownbeat ? 25 : 15}
          shadowOpacity={isDownbeat ? 1 : 0.7}
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
