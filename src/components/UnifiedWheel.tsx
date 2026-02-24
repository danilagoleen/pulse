import { Stage, Layer, Circle, Line, Text, Arc, Group, Ring } from 'react-konva';
import { SCALE_COLORS, CAMELOT_TO_KEY, predictNextKey, getScalePolygon } from '../music/theory';
import { getScaleDef } from '../music/scales_db';

interface UnifiedWheelProps {
  currentCamelot: string;
  selectedScaleName?: string;
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

function parseCamelot(key: string): { num: number; mode: 'A' | 'B' } | null {
  const match = key.match(/^(\d{1,2})(A|B)$/);
  if (!match) return null;
  const num = Number.parseInt(match[1], 10);
  if (num < 1 || num > 12) return null;
  return { num, mode: match[2] as 'A' | 'B' };
}

export const UnifiedWheel: React.FC<UnifiedWheelProps> = ({
  currentCamelot,
  selectedScaleName,
  predictedKey,
  onCamelotChange,
  size = 320,
  bpm = 0,
  beatPhase = 0,
}) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size * 0.46;
  const outerBandInner = outerRadius - 24;
  const innerBandOuter = outerBandInner - 4;
  const innerBandInner = innerBandOuter - 24;
  const middleRadius = innerBandInner - 6;
  const polygonRadius = size * 0.25;
  const segmentAngle = 360 / 12;

  const currentColor = SCALE_COLORS[currentCamelot] || '#45B7D1';
  const keyName = CAMELOT_TO_KEY[currentCamelot] || 'C';
  const rootSemitone = Math.max(0, NOTE_NAMES.indexOf(keyName));
  const selectedScaleDef = selectedScaleName ? getScaleDef(selectedScaleName) : null;
  const scalePolygon = selectedScaleDef
    ? {
        name: selectedScaleDef.name,
        vertices: selectedScaleDef.vertices.map((v) => (v + rootSemitone) % 12),
        colors: selectedScaleDef.colors,
        genres: selectedScaleDef.genres,
      }
    : getScalePolygon(currentCamelot);
  const predicted = predictedKey || predictNextKey(currentCamelot);

  const currentParsed = parseCamelot(currentCamelot);
  const currentNum = currentParsed?.num ?? 8;

  const polygonVertices = scalePolygon.vertices.map((semitone, idx) => {
    const angle = ((semitone * 30) - 90) * (Math.PI / 180);
    return {
      x: centerX + polygonRadius * Math.cos(angle),
      y: centerY + polygonRadius * Math.sin(angle),
      note: NOTE_NAMES[semitone],
      color: scalePolygon.colors[idx % scalePolygon.colors.length],
    };
  });

  const polygonPoints = polygonVertices.flatMap(v => [v.x, v.y]);

  const handleSegmentClick = (key: string) => {
    if (onCamelotChange) onCamelotChange(key);
  };

  const beatDistance = Math.min(beatPhase, 1 - beatPhase);
  const pulseStrength = bpm > 0 ? Math.max(0, 1 - beatDistance / 0.18) : 0;
  const isDownbeat = pulseStrength > 0.75;
  const pulseRadius = outerRadius + pulseStrength * 16;

  const predictedParsed = predicted ? parseCamelot(predicted) : null;

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

        {Array.from({ length: 12 }).map((_, i) => {
          const num = i + 1;
          const angle = i * segmentAngle;
          const majorKey = `${num}B`;
          const minorKey = `${num}A`;
          const majorName = CAMELOT_TO_KEY[majorKey] || '';
          const minorName = `${CAMELOT_TO_KEY[minorKey] || ''}m`;
          const color = SCALE_COLORS[majorKey] || ITTEN_COLORS[i];

          const isMajorActive = currentCamelot === majorKey;
          const isMinorActive = currentCamelot === minorKey;
          const majorOpacity = isMajorActive ? 1 : currentNum === num ? 0.46 : 0.32;
          const minorOpacity = isMinorActive ? 0.95 : currentNum === num ? 0.42 : 0.28;

          return (
            <Group key={`sector-${num}`}>
              <Arc
                x={centerX}
                y={centerY}
                innerRadius={outerBandInner}
                outerRadius={outerRadius}
                angle={segmentAngle - 2}
                rotation={angle - 90}
                fill={color}
                opacity={majorOpacity}
                shadowColor={isMajorActive ? color : 'transparent'}
                shadowBlur={isMajorActive ? 14 : 0}
                onClick={() => handleSegmentClick(majorKey)}
                onTap={() => handleSegmentClick(majorKey)}
              />
              <Arc
                x={centerX}
                y={centerY}
                innerRadius={innerBandInner}
                outerRadius={innerBandOuter}
                angle={segmentAngle - 2}
                rotation={angle - 90}
                fill={color}
                opacity={minorOpacity}
                shadowColor={isMinorActive ? color : 'transparent'}
                shadowBlur={isMinorActive ? 12 : 0}
                onClick={() => handleSegmentClick(minorKey)}
                onTap={() => handleSegmentClick(minorKey)}
              />

              <Text
                x={centerX + (outerRadius - 12) * Math.cos((angle + segmentAngle / 2 - 90) * Math.PI / 180) - 8}
                y={centerY + (outerRadius - 12) * Math.sin((angle + segmentAngle / 2 - 90) * Math.PI / 180) - 6}
                text={majorName}
                fontSize={13}
                fill={isMajorActive ? '#fff' : '#d6d6d6'}
                fontStyle="bold"
              />
              <Text
                x={centerX + (outerRadius - 26) * Math.cos((angle + segmentAngle / 2 - 90) * Math.PI / 180) - 8}
                y={centerY + (outerRadius - 26) * Math.sin((angle + segmentAngle / 2 - 90) * Math.PI / 180) - 5}
                text={majorKey}
                fontSize={9}
                fill={isMajorActive ? '#fff' : '#8d8d8d'}
                fontStyle="bold"
              />
              <Text
                x={centerX + (innerBandInner + 8) * Math.cos((angle + segmentAngle / 2 - 90) * Math.PI / 180) - 11}
                y={centerY + (innerBandInner + 8) * Math.sin((angle + segmentAngle / 2 - 90) * Math.PI / 180) - 6}
                text={minorName}
                fontSize={12}
                fill={isMinorActive ? '#fff' : '#d0d0d0'}
                fontStyle="bold"
              />
              <Text
                x={centerX + (innerBandInner + 20) * Math.cos((angle + segmentAngle / 2 - 90) * Math.PI / 180) - 8}
                y={centerY + (innerBandInner + 20) * Math.sin((angle + segmentAngle / 2 - 90) * Math.PI / 180) - 5}
                text={minorKey}
                fontSize={9}
                fill={isMinorActive ? '#fff' : '#8d8d8d'}
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
          stroke={predicted ? (SCALE_COLORS[predicted] || currentColor) : currentColor}
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
          x={centerX - 34}
          y={centerY + 24}
          text={currentCamelot}
          fontSize={14}
          fill={currentColor}
          fontStyle="bold"
          opacity={0.95}
        />
        <Text
          x={centerX - 54}
          y={centerY + 42}
          text={scalePolygon.name.split(' ')[0]}
          fontSize={11}
          fill={currentColor}
          opacity={0.82}
        />

        {predictedParsed && predictedParsed.num >= 1 && predictedParsed.num <= 12 && (
          <Circle
            x={
              centerX +
              (predictedParsed.mode === 'B' ? outerBandInner + 8 : innerBandInner + 8) *
                Math.cos(((predictedParsed.num - 1) * segmentAngle + segmentAngle / 2 - 90) * Math.PI / 180)
            }
            y={
              centerY +
              (predictedParsed.mode === 'B' ? outerBandInner + 8 : innerBandInner + 8) *
                Math.sin(((predictedParsed.num - 1) * segmentAngle + segmentAngle / 2 - 90) * Math.PI / 180)
            }
            radius={4}
            fill={SCALE_COLORS[predicted] || '#aaa'}
            shadowColor={SCALE_COLORS[predicted] || '#aaa'}
            shadowBlur={8}
            opacity={0.95}
          />
        )}
      </Layer>
    </Stage>
  );
};

export default UnifiedWheel;
