import { Stage, Layer, Circle, Line, Text, Arc, Group } from 'react-konva';
import { SCALE_COLORS, CAMELOT_WHEEL, CAMELOT_KEYS } from '../music/theory';

interface CamelotModeWheelProps {
  currentCamelot: string;
  scaleNotes?: number[];
  onCamelotChange?: (key: string) => void;
  size?: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const CamelotModeWheel: React.FC<CamelotModeWheelProps> = ({
  currentCamelot,
  scaleNotes,
  onCamelotChange,
  size = 300,
}) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size * 0.45;
  const innerRadius = size * 0.30;
  const segmentAngle = 360 / 12;

  const notes = scaleNotes || CAMELOT_WHEEL[currentCamelot] || [60, 62, 64, 65, 67, 69, 71];
  const isMinor = currentCamelot.endsWith('A');
  
  const polygonVertices = notes.map((midiNote) => {
    const noteIndex = midiNote % 12;
    const angle = ((noteIndex * 30) - 90) * (Math.PI / 180);
    return {
      x: centerX + innerRadius * Math.cos(angle),
      y: centerY + innerRadius * Math.sin(angle),
      note: NOTE_NAMES[noteIndex],
      color: SCALE_COLORS[currentCamelot] || '#45B7D1',
      midi: midiNote,
    };
  });

  const polygonPoints = polygonVertices.flatMap(v => [v.x, v.y]);

  const handleSegmentClick = (key: string) => {
    if (onCamelotChange) {
      onCamelotChange(key);
    }
  };

  return (
    <Stage width={size} height={size}>
      <Layer>
        {/* Outer circle background */}
        <Circle
          x={centerX}
          y={centerY}
          radius={outerRadius}
          fill="#0a0a0a"
          stroke="#333"
          strokeWidth={2}
        />

        {/* 12 Camelot segments */}
        {CAMELOT_KEYS.map((key, i) => {
          const angle = i * segmentAngle;
          const isActive = key === currentCamelot;
          const color = SCALE_COLORS[key] || '#45B7D1';
          
          return (
            <Group key={key} onClick={() => handleSegmentClick(key)} onTap={() => handleSegmentClick(key)}>
              <Arc
                x={centerX}
                y={centerY}
                innerRadius={outerRadius - 25}
                outerRadius={outerRadius}
                angle={segmentAngle - 2}
                rotation={angle - 90}
                fill={color}
                opacity={isActive ? 1 : 0.4}
                shadowColor={isActive ? color : 'transparent'}
                shadowBlur={isActive ? 15 : 0}
                shadowOpacity={0.8}
              />
              <Text
                x={centerX + (outerRadius - 15) * Math.cos((angle + segmentAngle / 2 - 90) * Math.PI / 180) - 8}
                y={centerY + (outerRadius - 15) * Math.sin((angle + segmentAngle / 2 - 90) * Math.PI / 180) - 6}
                text={key}
                fontSize={10}
                fill={isActive ? '#fff' : '#888'}
                fontStyle="bold"
              />
            </Group>
          );
        })}

        {/* Middle ring */}
        <Circle
          x={centerX}
          y={centerY}
          radius={innerRadius + 10}
          stroke={SCALE_COLORS[currentCamelot]}
          strokeWidth={2}
          opacity={0.5}
        />

        {/* Inner polygon for scale */}
        {polygonVertices.length > 2 && (
          <>
            {/* Filled polygon */}
            <Line
              points={[...polygonPoints, polygonPoints[0], polygonPoints[1]]}
              fill={SCALE_COLORS[currentCamelot]}
              opacity={0.15}
              closed
            />
            
            {/* Polygon outline */}
            <Line
              points={[...polygonPoints, polygonPoints[0], polygonPoints[1]]}
              stroke={SCALE_COLORS[currentCamelot]}
              strokeWidth={2}
              dash={[8, 4]}
              closed
              opacity={0.9}
            />
            
            {/* Vertices */}
            {polygonVertices.map((v, i) => (
              <Group key={i}>
                <Circle
                  x={v.x}
                  y={v.y}
                  radius={10}
                  fill={v.color}
                  stroke="#fff"
                  strokeWidth={2}
                  shadowColor={v.color}
                  shadowBlur={10}
                  shadowOpacity={0.8}
                />
                <Text
                  x={v.x - 5}
                  y={v.y - 5}
                  text={v.note}
                  fontSize={10}
                  fill="#fff"
                  fontStyle="bold"
                />
              </Group>
            ))}
          </>
        )}

        {/* Center key display */}
        <Circle
          x={centerX}
          y={centerY}
          radius={size * 0.12}
          fill="#1a1a1a"
          stroke={SCALE_COLORS[currentCamelot]}
          strokeWidth={3}
        />
        <Text
          x={centerX - 20}
          y={centerY - 12}
          text={currentCamelot}
          fontSize={28}
          fontStyle="bold"
          fill={SCALE_COLORS[currentCamelot]}
        />
        <Text
          x={centerX - 15}
          y={centerY + 14}
          text={isMinor ? 'Minor' : 'Major'}
          fontSize={12}
          fill="#888"
        />
      </Layer>
    </Stage>
  );
};

export default CamelotModeWheel;
